import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

type MailTransport = { sendMail(options: Record<string, unknown>): Promise<unknown> };
type Nodemailer = { createTransport(options: Record<string, unknown>): MailTransport };

@Injectable()
export class NotificationsService {
  async sendOverdueReminder(to: string, invoiceNumber: string, dueDate: Date, total: Prisma.Decimal, amountPaid: Prisma.Decimal): Promise<void> {
    const host = process.env.MAIL_HOST ?? process.env.SMTP_HOST;
    const from = process.env.MAIL_FROM ?? process.env.SMTP_FROM ?? process.env.MAIL_FROM_ADDRESS;
    if (!host || !from) throw new ServiceUnavailableException('Overdue reminders are not configured');
    const nodemailer = require('nodemailer') as Nodemailer;
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.MAIL_PORT ?? process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      ...((process.env.MAIL_USER ?? process.env.SMTP_USER) && {
        auth: {
          user: process.env.MAIL_USER ?? process.env.SMTP_USER,
          pass: process.env.MAIL_PASSWORD ?? process.env.SMTP_PASSWORD ?? process.env.SMTP_PASS ?? '',
        },
      }),
    });
    const outstanding = Prisma.Decimal.max(total.minus(amountPaid), 0);
    await transport.sendMail({ from, to, subject: `Payment reminder: invoice ${invoiceNumber}`, text: `Invoice ${invoiceNumber} was due on ${dueDate.toISOString().slice(0, 10)}. Outstanding balance: ${outstanding.toFixed(2)}.` });
  }

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
