import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-google-oauth20';
import { AuthService } from './auth.service';

export interface GoogleProfilePayload {
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  googleId: string;
  emailVerified: boolean;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  public constructor(config: ConfigService, private readonly auth: AuthService) {
    super({
      clientID: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  public async validate(_accessToken: string, _refreshToken: string, profile: Profile): Promise<GoogleProfilePayload> {
    const email = profile.emails?.[0]?.value?.trim().toLowerCase();
    if (!email) throw new Error('Google account did not provide an email address');
    return {
      email,
      displayName: profile.displayName ?? email,
      firstName: profile.name?.givenName ?? '',
      lastName: profile.name?.familyName ?? '',
      googleId: profile.id,
      emailVerified: profile._json?.email_verified === true,
    };
  }
}
