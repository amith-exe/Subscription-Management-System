import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';
import { GoogleStrategy } from './google.strategy';
import { GoogleAuthGuard } from './google-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';
@Module({ imports: [PassportModule, JwtModule.register({}), MailModule, AuditModule], controllers: [AuthController], providers: [AuthService, JwtStrategy, LocalStrategy, GoogleStrategy, GoogleAuthGuard, PrismaService], exports: [AuthService] })
export class AuthModule {}
