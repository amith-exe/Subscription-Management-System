import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from './auth.types';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') { public constructor(config: ConfigService, private readonly prisma: PrismaService) { super({ jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'), algorithms: ['HS256'] }); } public async validate(payload: { sub: string; email: string }): Promise<AuthenticatedUser> { const user = await this.prisma.user.findUnique({ where: { id: payload.sub }, include: { customer: true } }); if (!user || !user.isActive) throw new UnauthorizedException(); return { id: user.id, email: user.email, role: user.role, customerId: user.customer?.id ?? null, mustChangePassword: user.mustChangePassword }; } }
