import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, MessageResponse, ResetPasswordDto, ResendOtpDto, SignupDto, UserResponse, VerifyEmailDto, AuthTokensResponse } from './auth.dto';
import { Public } from '../../common/auth/public.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from './auth.types';
import { ALLOW_PASSWORD_CHANGE_KEY } from './auth.constants';
import { SetMetadata } from '@nestjs/common';
import { GoogleAuthGuard } from './google-auth.guard';
import { GoogleProfilePayload } from './google.strategy';
import { Throttle } from '@nestjs/throttler';

class LoginResponse extends AuthTokensResponse { @ApiProperty({ description: 'Whether the login requires the optional second factor', example: false, required: true }) pending2fa!: boolean; }
@ApiTags('auth')
@Throttle({ default: { limit: 5, ttl: 60000 } })
@Controller('auth')
export class AuthController {
  public constructor(private readonly auth: AuthService) {}
  @Get('google') @Public() @UseGuards(GoogleAuthGuard) @ApiOperation({ summary: 'Start Google OAuth login' }) @ApiResponse({ status: 302, description: 'Redirects to Google consent' }) public google(): void {}
  @Get('google/callback') @Public() @UseGuards(GoogleAuthGuard) @ApiOperation({ summary: 'Complete Google OAuth login and set the refresh cookie' }) @ApiResponse({ status: 200, type: AuthTokensResponse }) @ApiResponse({ status: 401, description: 'Google account could not be authenticated' }) public async googleCallback(@Req() req: Request & { user: GoogleProfilePayload }, @Res({ passthrough: true }) res: Response): Promise<AuthTokensResponse> { return this.auth.googleLogin(req.user, res); }
  @Post('signup') @Public() @ApiOperation({ summary: 'Create a customer account' }) @ApiResponse({ status: 201, type: MessageResponse }) @ApiResponse({ status: 409, description: 'Email already exists' }) public async signup(@Body() dto: SignupDto, @Req() req: Request): Promise<MessageResponse> { return this.auth.signup(dto, req.ip); }
  @Post('verify-email') @Public() @ApiOperation({ summary: 'Verify email with OTP' }) @ApiResponse({ status: 200, type: MessageResponse }) @ApiResponse({ status: 400, description: 'Invalid, expired, or exhausted OTP' }) public async verify(@Body() dto: VerifyEmailDto): Promise<MessageResponse> { return this.auth.verifyEmail(dto); }
  @Post('resend-otp') @Public() @ApiOperation({ summary: 'Resend verification OTP' }) @ApiResponse({ status: 200, type: MessageResponse }) public async resend(@Body() dto: ResendOtpDto): Promise<MessageResponse> { return this.auth.resendOtp(dto); }
  @Post('login') @Public() @HttpCode(200) @ApiOperation({ summary: 'Log in; refresh token is an httpOnly cookie' }) @ApiResponse({ status: 200, type: LoginResponse }) @ApiResponse({ status: 401, description: 'Invalid email or password' }) @ApiResponse({ status: 423, description: 'Account locked' }) public async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthTokensResponse> { return this.auth.loginWithCookie(dto, req.ip, req.headers['user-agent'], res); }
  @Post('refresh') @Public() @HttpCode(200) @ApiOperation({ summary: 'Rotate the httpOnly refresh cookie; CSRF protection should be added at the edge for cross-site deployments' }) @ApiResponse({ status: 200, type: AuthTokensResponse }) @ApiResponse({ status: 401, description: 'Invalid or reused refresh token' }) public async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthTokensResponse> { const raw = req.cookies?.refresh_token as string | undefined; if (!raw) throw new UnauthorizedException('Missing refresh token'); return this.auth.refresh(raw, res, req.headers['user-agent'], req.ip); }
  @Post('logout') @ApiBearerAuth('access-token') @HttpCode(200) @ApiOperation({ summary: 'Revoke the current refresh session' }) @ApiResponse({ status: 200, type: MessageResponse }) public async logout(@CurrentUser() user: AuthenticatedUser, @Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<MessageResponse> { res.clearCookie('refresh_token', { path: '/auth' }); return this.auth.logout(user.id, req.cookies?.refresh_token as string | undefined); }
  @Post('logout-all') @ApiBearerAuth('access-token') @HttpCode(200) @ApiOperation({ summary: 'Revoke all sessions' }) @ApiResponse({ status: 200, type: MessageResponse }) public async logoutAll(@CurrentUser() user: AuthenticatedUser, @Res({ passthrough: true }) res: Response): Promise<MessageResponse> { res.clearCookie('refresh_token', { path: '/auth' }); return this.auth.logoutAll(user.id); }
  @Post('forgot-password') @Public() @HttpCode(200) @ApiOperation({ summary: 'Request a password reset' }) @ApiResponse({ status: 200, type: MessageResponse }) public async forgot(@Body() dto: ForgotPasswordDto): Promise<MessageResponse> { return this.auth.forgotPassword(dto); }
  @Post('reset-password') @Public() @HttpCode(200) @ApiOperation({ summary: 'Reset password from emailed token' }) @ApiResponse({ status: 200, type: MessageResponse }) @ApiResponse({ status: 400, description: 'Invalid or expired token' }) public async reset(@Body() dto: ResetPasswordDto): Promise<MessageResponse> { return this.auth.resetPassword(dto); }
  @Post('change-password') @ApiBearerAuth('access-token') @SetMetadata(ALLOW_PASSWORD_CHANGE_KEY, true) @HttpCode(200) @ApiOperation({ summary: 'Change current password' }) @ApiResponse({ status: 200, type: MessageResponse }) public async change(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto): Promise<MessageResponse> { return this.auth.changePassword(user.id, dto); }
}
