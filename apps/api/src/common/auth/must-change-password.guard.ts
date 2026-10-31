import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthenticatedUser } from '../../modules/auth/auth.types';
import { IS_PUBLIC_KEY } from './public.decorator';
import { ALLOW_PASSWORD_CHANGE_KEY } from '../../modules/auth/auth.constants';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  public constructor(private readonly reflector: Reflector) {}
  public canActivate(context: ExecutionContext): boolean {
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()])) return true;
    if (this.reflector.getAllAndOverride<boolean>(ALLOW_PASSWORD_CHANGE_KEY, [context.getHandler(), context.getClass()])) return true;
    const user = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>().user;
    if (user?.mustChangePassword === true) throw new ForbiddenException('Password change is required before continuing');
    return true;
  }
}
