import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthenticatedUser } from '../../modules/auth/auth.types';
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedUser => (context.switchToHttp().getRequest<Request & { user: AuthenticatedUser }>().user));
