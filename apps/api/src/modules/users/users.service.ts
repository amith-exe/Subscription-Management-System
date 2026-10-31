import { ConflictException, Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuditService } from '../audit/audit.module';
import { CreateStaffDto } from './users.dto';
import { UserResponse } from '../auth/auth.dto';

@Injectable()
export class UsersService {
  public constructor(private readonly prisma: PrismaService, private readonly mail: MailService, private readonly audit: AuditService) {}

  public async createStaff(dto: CreateStaffDto, adminId: string, ip?: string): Promise<UserResponse> {
    const email = dto.email.trim().toLowerCase();
    const temporaryPassword = randomBytes(18).toString('base64url');
    try {
      const user = await this.prisma.user.create({ data: { email, passwordHash: await argon2.hash(temporaryPassword), role: Role.INTERNAL, mustChangePassword: true } });
      await this.mail.send('invite', email, { email: user.email, name: dto.name.trim(), temporaryPassword });
      await this.audit.log({ userId: adminId, action: 'STAFF_CREATED', entity: 'User', entityId: user.id, ipAddress: ip });
      return { id: user.id, email: user.email, role: user.role, emailVerified: false };
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Unique constraint')) throw new ConflictException('Email is already registered');
      throw error;
    }
  }

  public async getCurrentCustomer(userId: string): Promise<{ id: string; name: string; company: string | null }> {
    return this.prisma.customer.findUniqueOrThrow({ where: { userId }, select: { id: true, name: true, company: true } });
  }
}
