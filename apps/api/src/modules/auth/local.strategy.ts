import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-local';
import { AuthService } from './auth.service';
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy, 'local') { public constructor(private readonly auth: AuthService) { super({ usernameField: 'email' }); } public async validate(email: string, password: string): Promise<unknown> { return this.auth.login({ email, password }); } }
