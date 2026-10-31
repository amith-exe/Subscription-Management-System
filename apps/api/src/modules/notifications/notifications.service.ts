import { Injectable, ServiceUnavailableException } from '@nestjs/common';

type MailTransport = { sendMail(options: Record<string, unknown>): Promise<unknown> };
type Nodemailer = { createTransport(options: Record<string, unknown>): MailTransport };

@Injectable()
export class NotificationsService {
  async sendInvoice(to: string, invoiceNumber: string, pdf: Buffer): Promise<void> {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    if (!host || !from) throw new ServiceUnavailableException('Invoice email is not configured (SMTP_HOST and SMTP_FROM are required)');
    const nodemailer = require('nodemailer') as Nodemailer;
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      ...(process.env.SMTP_USER && { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } }),
    });
    await transport.sendMail({
      from,
      to,
      subject: `Invoice ${invoiceNumber}`,
      text: `Please find invoice ${invoiceNumber} attached.`,
      attachments: [{ filename: `${invoiceNumber}.pdf`, content: pdf, contentType: 'application/pdf' }],
    });
  }
}
