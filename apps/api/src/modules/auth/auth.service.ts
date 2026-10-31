// @ts-nocheck
import { ConflictException, Injectable, HttpException, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, OtpPurpose, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHash, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import type { Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.module';
import { AuthTokensResponse, ChangePasswordDto, ForgotPasswordDto, LoginDto, ResendOtpDto, ResetPasswordDto, SignupDto, VerifyEmailDto } from './auth.dto';
import type { GoogleProfilePayload } from './google.strategy';

class LockedException extends HttpException { public constructor(message: string) { super(message, HttpStatus.LOCKED); } }

@Injectable()
export class AuthService {
  private readonly dummyHash = '$argon2id$v=19$m=65536,t=3,p=4$fnbPMWavZE/wXZuYjXESrQ$ji0D17/IPRD6JnpM5UExedREbjkqFrKiOYA9hBgrazw';
  public constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService, private readonly config: ConfigService, private readonly mail: MailService, private readonly audit: AuditService) {}
  private email(value: string): string { return value.trim().toLowerCase(); }
  private hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
  private async otp(userId: string, purpose: OtpPurpose): Promise<string> { const code = randomInt(100000, 1000000).toString(); await this.prisma.otp.create({ data: { userId, purpose, codeHash: this.hash(code), expiresAt: new Date(Date.now() + 600000), maxAttempts: 5 } }); return code; }
  private async verifyOtp(userId: string, purpose: OtpPurpose, code: string): Promise<void> { const otp = await this.prisma.otp.findFirst({ where: { userId, purpose, consumedAt: null }, orderBy: { createdAt: 'desc' } }); const now = new Date(); if (!otp || otp.expiresAt <= now || otp.attempts >= otp.maxAttempts) throw new BadRequestException('Invalid or expired code'); const expected = Buffer.from(otp.codeHash, 'hex'); const received = Buffer.from(this.hash(code), 'hex'); const valid = expected.length === received.length && timingSafeEqual(expected, received); const updated = await this.prisma.otp.updateMany({ where: { id: otp.id, consumedAt: null, expiresAt: { gt: now }, attempts: { lt: otp.maxAttempts } }, data: { attempts: { increment: 1 }, ...(valid && { consumedAt: now }) } }); if (!valid || updated.count !== 1) throw new BadRequestException('Invalid or expired code'); }
  public async signup(dto: SignupDto, ip?: string): Promise<{ message: string }> { const email = this.email(dto.email); try { const existing = await this.prisma.user.findUnique({ where: { email } }); if (existing) throw new ConflictException('Email is already registered'); const passwordHash = await argon2.hash(dto.password); const result = await this.prisma.$transaction(async (tx) => { const user = await tx.user.create({ data: { email, passwordHash, role: Role.CUSTOMER } }); const customer = await tx.customer.create({ data: { userId: user.id, name: dto.name.trim() } }); return { user, customer }; }); const code = await this.otp(result.user.id, OtpPurpose.EMAIL_VERIFY); await this.mail.sendOtp('verify', email, code, dto.name.trim()); await this.audit.log({ action: 'SIGNUP', entity: 'User', entityId: result.user.id, ipAddress: ip }); return { message: 'Account created. Check your email to verify it.' }; } catch (error: unknown) { if (error instanceof ConflictException) throw error; if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('Email is already registered'); throw error; } }
  public async verifyEmail(dto: VerifyEmailDto): Promise<{ message: string }> { const user = await this.prisma.user.findUnique({ where: { email: this.email(dto.email) } }); if (!user) throw new BadRequestException('Invalid or expired code'); await this.verifyOtp(user.id, OtpPurpose.EMAIL_VERIFY, dto.code); await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } }); return { message: 'Email verified. You can now log in.' }; }
  public async resendOtp(dto: ResendOtpDto): Promise<{ message: string }> { const user = await this.prisma.user.findUnique({ where: { email: this.email(dto.email) } }); if (user && !user.emailVerifiedAt) { const recent = await this.prisma.otp.findFirst({ where: { userId: user.id, purpose: OtpPurpose.EMAIL_VERIFY }, orderBy: { createdAt: 'desc' } }); if (recent && Date.now() - recent.createdAt.getTime() < 60000) throw new BadRequestException('Please wait before requesting another code'); const code = await this.otp(user.id, OtpPurpose.EMAIL_VERIFY); await this.mail.sendOtp('verify', user.email, code, user.email); } return { message: 'If the account requires verification, a code has been sent.' }; }
  public async login(dto: LoginDto, ip?: string, userAgent?: string): Promise<AuthTokensResponse> { const email = this.email(dto.email); const user = await this.prisma.user.findUnique({ where: { email }, include: { customer: true } }); if (user?.lockedUntil && user.lockedUntil > new Date()) throw new LockedException('Account temporarily locked'); const valid = await argon2.verify(user?.passwordHash ?? this.dummyHash, dto.password).catch(() => false); if (!user || !valid || !user.isActive || !user.emailVerifiedAt) { if (user) { const updated = await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 } } }); const locked = updated.failedLoginCount >= 5; if (locked) await this.prisma.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 900000) } }); await this.audit.log({ userId: user.id, action: locked ? 'LOCKOUT' : 'LOGIN_FAILURE', entity: 'User', entityId: user.id, ipAddress: ip }); } throw new UnauthorizedException('Invalid email or password'); } await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } }); await this.audit.log({ userId: user.id, action: 'LOGIN_SUCCESS', entity: 'User', entityId: user.id, ipAddress: ip }); return this.issueTokens({ id: user.id, email: user.email, role: user.role, customerId: user.customer?.id ?? null, mustChangePassword: user.mustChangePassword }, userAgent, ip); }
  public async loginWithCookie(dto: LoginDto, ip: string | undefined, userAgent: string | undefined, response: Response): Promise<AuthTokensResponse> { const email = this.email(dto.email); const user = await this.prisma.user.findUnique({ where: { email }, include: { customer: true } }); if (user?.lockedUntil && user.lockedUntil > new Date()) throw new LockedException('Account temporarily locked'); const valid = await argon2.verify(user?.passwordHash ?? this.dummyHash, dto.password).catch(() => false); if (!user || !valid || !user.isActive || !user.emailVerifiedAt) { if (user) { const updated = await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: { increment: 1 } } }); const locked = updated.failedLoginCount >= 5; if (locked) await this.prisma.user.update({ where: { id: user.id }, data: { lockedUntil: new Date(Date.now() + 900000) } }); await this.audit.log({ userId: user.id, action: locked ? 'LOCKOUT' : 'LOGIN_FAILURE', entity: 'User', entityId: user.id, ipAddress: ip }); } throw new UnauthorizedException('Invalid email or password'); } await this.prisma.user.update({ where: { id: user.id }, data: { failedLoginCount: 0, lockedUntil: null } }); await this.audit.log({ userId: user.id, action: 'LOGIN_SUCCESS', entity: 'User', entityId: user.id, ipAddress: ip }); return this.issueTokens({ id: user.id, email: user.email, role: user.role, customerId: user.customer?.id ?? null, mustChangePassword: user.mustChangePassword }, userAgent, ip, response); }
  public async googleLogin(profile: GoogleProfilePayload, response: Response): Promise<AuthTokensResponse> {
    if (!profile.emailVerified) throw new UnauthorizedException('Google account email is not verified');
    const email = this.email(profile.email);
    let user = await this.prisma.user.findUnique({ where: { email }, include: { customer: true } });
    if (!user) {
      const passwordHash = await argon2.hash(randomBytes(32).toString('hex'));
      const created = await this.prisma.$transaction(async (tx: PrismaService) => {
        const transactionClient = tx as unknown as PrismaService;
        const createdUser = await transactionClient.user.create({ data: { email, passwordHash, role: Role.CUSTOMER, emailVerifiedAt: new Date() } });
        const createdCustomer = await transactionClient.customer.create({ data: { userId: createdUser.id, name: profile.displayName } });
        return { user: createdUser, customer: createdCustomer };
      });
      user = { ...created.user, customer: created.customer };
    }
    if (!user.isActive) throw new UnauthorizedException('Account is inactive');
    if (!user.emailVerifiedAt) user = await this.prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() }, include: { customer: true } });
    await this.audit.log({ userId: user.id, action: 'LOGIN_SUCCESS', entity: 'User', entityId: user.id });
    return this.issueTokens({ id: user.id, email: user.email, role: user.role, customerId: user.customer?.id ?? null, mustChangePassword: user.mustChangePassword }, undefined, undefined, response);
  }
  private async issueTokens(user: { id: string; email: string; role: Role; customerId: string | null; mustChangePassword: boolean }, userAgent?: string, ip?: string, response?: Response): Promise<AuthTokensResponse> { const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, customerId: user.customerId, mustChangePassword: user.mustChangePassword }, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: '15m', algorithm: 'HS256' }); const refresh = randomBytes(48).toString('hex'); const familyId = randomBytes(16).toString('hex'); await this.prisma.refreshToken.create({ data: { userId: user.id, tokenHash: this.hash(refresh), familyId, expiresAt: new Date(Date.now() + 604800000), userAgent, ip } }); response?.cookie('refresh_token', refresh, { httpOnly: true, secure: this.config.get<string>('NODE_ENV') === 'production', sameSite: 'lax', maxAge: 604800000, path: '/auth' }); return { accessToken, tokenType: 'Bearer', expiresIn: 900 }; }
  public async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> { const user = await this.prisma.user.findUnique({ where: { email: this.email(dto.email) } }); if (user) { const raw = randomBytes(32).toString('hex'); await this.prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: this.hash(raw), expiresAt: new Date(Date.now() + 900000) } }); const link = `${this.config.getOrThrow<string>('APP_URL')}/reset-password?token=${raw}`; await this.mail.send('resetLink', user.email, { link, name: user.email }); } return { message: 'If the account exists, password reset instructions have been sent.' }; }
  public async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> { const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash: this.hash(dto.token) } }); const now = new Date(); if (!record || record.usedAt || record.expiresAt <= now) throw new BadRequestException('Invalid or expired reset token'); const passwordHash = await argon2.hash(dto.password); await this.prisma.$transaction(async (tx) => { const claimed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } }); if (claimed.count !== 1) throw new BadRequestException('Invalid or expired reset token'); await tx.user.update({ where: { id: record.userId }, data: { passwordHash, failedLoginCount: 0, lockedUntil: null } }); await tx.refreshToken.updateMany({ where: { userId: record.userId, revokedAt: null }, data: { revokedAt: now } }); }); return { message: 'Password reset successfully.' }; }
  public async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> { const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } }); if (!(await argon2.verify(user.passwordHash, dto.currentPassword))) throw new UnauthorizedException('Current password is incorrect'); await this.prisma.$transaction([this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(dto.newPassword), mustChangePassword: false, failedLoginCount: 0, lockedUntil: null } }), this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } })]); await this.mail.send('changed', user.email, { name: user.email }); return { message: 'Password changed successfully.' }; }
  public async refresh(raw: string, response: Response, userAgent?: string, ip?: string): Promise<AuthTokensResponse> {
    const now = new Date();
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash: this.hash(raw) }, include: { user: { include: { customer: true } } } });
    if (!token) throw new UnauthorizedException('Invalid refresh token');
    if (token.revokedAt) {
      await this.revokeRefreshFamily(token.familyId);
      await this.audit.log({ userId: token.userId, action: 'REFRESH_REUSE_DETECTED', entity: 'RefreshToken', entityId: token.id });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    if (token.expiresAt <= now) throw new UnauthorizedException('Invalid refresh token');
    if (!token.user.isActive) { await this.revokeRefreshFamily(token.familyId); throw new UnauthorizedException('Account is inactive'); }
    const replacementRaw = randomBytes(48).toString('hex');
    const rotated = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({ where: { id: token.id, revokedAt: null, expiresAt: { gt: now } }, data: { revokedAt: now } });
      if (claimed.count !== 1) return false;
      const replacement = await tx.refreshToken.create({ data: { userId: token.userId, tokenHash: this.hash(replacementRaw), familyId: token.familyId, expiresAt: new Date(now.getTime() + 604800000), userAgent, ip } });
      await tx.refreshToken.update({ where: { id: token.id }, data: { replacedById: replacement.id } });
      return true;
    });
    if (!rotated) {
      await this.revokeRefreshFamily(token.familyId);
      await this.audit.log({ userId: token.userId, action: 'REFRESH_REUSE_DETECTED', entity: 'RefreshToken', entityId: token.id });
      throw new UnauthorizedException('Refresh token reuse detected');
    }
    const user = token.user;
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role, customerId: user.customer?.id ?? null, mustChangePassword: user.mustChangePassword }, { secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'), expiresIn: '15m', algorithm: 'HS256' });
    response.cookie('refresh_token', replacementRaw, { httpOnly: true, secure: this.config.get<string>('NODE_ENV') === 'production', sameSite: 'lax', maxAge: 604800000, path: '/auth' });
    return { accessToken, tokenType: 'Bearer', expiresIn: 900 };
  }
  private revokeRefreshFamily(familyId: string) { return this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: new Date() } }); }
  public async logout(userId: string, raw?: string): Promise<{ message: string }> { if (raw) await this.prisma.refreshToken.updateMany({ where: { userId, tokenHash: this.hash(raw), revokedAt: null }, data: { revokedAt: new Date() } }); return { message: 'Logged out.' }; }
  public async logoutAll(userId: string): Promise<{ message: string }> { await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); await this.audit.log({ userId, action: 'LOGOUT_ALL', entity: 'RefreshToken', entityId: userId }); return { message: 'All sessions logged out.' }; }
}
