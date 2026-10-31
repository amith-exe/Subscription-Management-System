import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as handlebars from 'handlebars';
import nodemailer, { Transporter } from 'nodemailer';

type MailData = Record<string, string>;

const templates: Record<string, { subject: string; html: string; text: string }> = {
  verify: { subject: 'Verify your Brightloop email', html: '<p>Hello {{name}},</p><p>Your verification code is <strong>{{code}}</strong>. It expires in 10 minutes.</p>', text: 'Hello {{name}}, your verification code is {{code}}. It expires in 10 minutes.' },
  welcome: { subject: 'Welcome to Brightloop', html: '<p>Welcome, {{name}}.</p>', text: 'Welcome, {{name}}.' },
  resetLink: { subject: 'Reset your Brightloop password', html: '<p>Use <a href="{{link}}">this secure link</a> within 15 minutes.</p>', text: 'Use this secure link within 15 minutes: {{link}}' },
  resetOtp: { subject: 'Your Brightloop password reset code', html: '<p>Your reset code is <strong>{{code}}</strong>.</p>', text: 'Your reset code is {{code}}.' },
  changed: { subject: 'Your Brightloop password changed', html: '<p>Your password was changed. If this was not you, contact support.</p>', text: 'Your password was changed. If this was not you, contact support.' },
  invite: { subject: 'You have been invited to Brightloop', html: '<p>Hello {{name}},</p><p>Your staff account is ready for {{email}}.</p><p>Temporary password: <strong>{{temporaryPassword}}</strong></p><p>Change it immediately after signing in.</p>', text: 'Hello {{name}}, your staff account is ready for {{email}}. Temporary password: {{temporaryPassword}}. Change it immediately after signing in.' },
  loginOtp: { subject: 'Your Brightloop sign-in code', html: '<p>Your sign-in code is <strong>{{code}}</strong>.</p>', text: 'Your sign-in code is {{code}}.' },
};

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;

  public constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.getOrThrow<string>('SMTP_HOST'),
      port: this.config.getOrThrow<number>('SMTP_PORT'),
      secure: this.config.getOrThrow<boolean>('SMTP_SECURE'),
      auth: { user: this.config.getOrThrow<string>('SMTP_USER'), pass: this.config.getOrThrow<string>('SMTP_PASS') },
    });
  }

  public async send(templateName: string, to: string, data: MailData): Promise<void> {
    const template = templates[templateName];
    if (!template) throw new Error(`Unknown mail template: ${templateName}`);
    const compile = (value: string): string => handlebars.compile(value)(data);
    const fromName = this.config.getOrThrow<string>('MAIL_FROM_NAME');
    const fromAddress = this.config.getOrThrow<string>('MAIL_FROM_ADDRESS');
    if (this.config.get<boolean>('QUEUE_ENABLED') === true) {
      this.logger.warn('QUEUE_ENABLED is true but no queue worker is configured; using direct SMTP fallback.');
    }
    await this.transporter.sendMail({ from: `"${fromName}" <${fromAddress}>`, to, subject: compile(template.subject), html: compile(template.html), text: compile(template.text) });
  }

  public async sendOtp(templateName: string, to: string, code: string, name: string): Promise<void> {
    if (this.config.get<boolean>('LOG_OTP_IN_DEV') === true && this.config.get<string>('NODE_ENV') === 'development') this.logger.debug(`OTP generated for ${to}: ${code}`);
    await this.send(templateName, to, { code, name });
  }
}
