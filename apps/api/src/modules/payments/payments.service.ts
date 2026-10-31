import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, PaymentAttemptStatus, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { canTransition, invoiceTransitions } from '../../common/state/transitions';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { VerifyRazorpayPaymentDto } from './payments.dto';

type RazorpayOrder = { id: string; amount: number; currency: string; status: string };
type RazorpayPayment = {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService, private readonly config: ConfigService) {}

  async createOrder(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { payments: true, customer: { include: { user: true } } },
    });
    if (!invoice || !user.customerId || invoice.customerId !== user.customerId) {
      throw new NotFoundException('Invoice not found');
    }
    if (![InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE].includes(invoice.status)) {
      throw new BadRequestException('Only confirmed, unpaid invoices can be paid online');
    }

    const outstanding = invoice.total.minus(
      invoice.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)),
    );
    if (outstanding.lte(0)) throw new BadRequestException('Invoice has no outstanding balance');

    const existing = await this.prisma.paymentAttempt.findFirst({
      where: { invoiceId, status: PaymentAttemptStatus.CREATED },
    });
    if (existing) return this.checkoutOrder(existing.providerOrderId, existing.amount, existing.currency, invoice.customer.name, invoice.customer.user.email);

    const amountPaise = Math.round(Number(outstanding.toFixed(2)) * 100);
    if (!Number.isSafeInteger(amountPaise) || amountPaise < 1) {
      throw new BadRequestException('Invoice amount cannot be represented in paise');
    }

    const razorpayOrder = await this.razorpayRequest<RazorpayOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: invoice.id.replaceAll('-', ''),
        notes: { invoiceId: invoice.id, invoiceNumber: String(invoice.number) },
      }),
    });

    try {
      const attempt = await this.prisma.paymentAttempt.create({
        data: { invoiceId, providerOrderId: razorpayOrder.id, amount: outstanding, currency: 'INR' },
      });
      return this.checkoutOrder(attempt.providerOrderId, attempt.amount, attempt.currency, invoice.customer.name, invoice.customer.user.email);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const concurrentAttempt = await this.prisma.paymentAttempt.findFirst({
          where: { invoiceId, status: PaymentAttemptStatus.CREATED },
        });
        if (concurrentAttempt) {
          return this.checkoutOrder(concurrentAttempt.providerOrderId, concurrentAttempt.amount, concurrentAttempt.currency, invoice.customer.name, invoice.customer.user.email);
        }
      }
      throw error;
    }
  }

  async verifyCheckoutPayment(user: AuthenticatedUser, input: VerifyRazorpayPaymentDto) {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId: input.razorpay_order_id },
      include: { invoice: true },
    });
    if (!attempt || !user.customerId || attempt.invoice.customerId !== user.customerId) {
      throw new NotFoundException('Payment order not found');
    }

    const expected = createHmac('sha256', this.keySecret())
      .update(`${input.razorpay_order_id}|${input.razorpay_payment_id}`)
      .digest();
    const supplied = /^[a-f\d]{64}$/i.test(input.razorpay_signature)
      ? Buffer.from(input.razorpay_signature, 'hex')
      : Buffer.alloc(0);
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
      throw new UnauthorizedException('Razorpay signature verification failed');
    }

    let payment = await this.razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(input.razorpay_payment_id)}`);
    if (payment.order_id !== attempt.providerOrderId || payment.amount !== this.toPaise(attempt.amount) || payment.currency !== attempt.currency) {
      throw new BadRequestException('Razorpay payment does not match this invoice order');
    }
    if (payment.status === 'authorized') {
      payment = await this.razorpayRequest<RazorpayPayment>(`/payments/${encodeURIComponent(payment.id)}/capture`, {
        method: 'POST',
        body: JSON.stringify({ amount: payment.amount, currency: payment.currency }),
      });
    }
    if (payment.status !== 'captured') {
      throw new BadRequestException('Razorpay has not captured this payment');
    }
    return this.recordCapturedPayment(attempt.providerOrderId, payment);
  }

  async handleWebhook(rawBody: Buffer | undefined, signature?: string) {
    if (!rawBody) throw new BadRequestException('Missing raw webhook payload');
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');
    if (!secret) throw new ServiceUnavailableException('Razorpay webhook secret is not configured');
    const expected = createHmac('sha256', secret).update(rawBody).digest();
    const supplied = signature && /^[a-f\d]{64}$/i.test(signature) ? Buffer.from(signature, 'hex') : Buffer.alloc(0);
    if (supplied.length !== expected.length || !timingSafeEqual(expected, supplied)) {
      throw new UnauthorizedException('Razorpay webhook signature verification failed');
    }

    let event: {
      event?: string;
      payload?: { payment?: { entity?: RazorpayPayment } };
    };
    try {
      event = JSON.parse(rawBody.toString('utf8')) as typeof event;
    } catch {
      throw new BadRequestException('Invalid webhook JSON');
    }
    const payment = event.payload?.payment?.entity;
    if (event.event === 'payment.captured' && payment?.order_id) {
      await this.recordCapturedPayment(payment.order_id, payment);
    }
    return { received: true };
  }

  private async recordCapturedPayment(orderId: string, payment: RazorpayPayment) {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId: orderId },
      include: { invoice: { include: { payments: true } } },
    });
    if (!attempt) throw new NotFoundException('Payment order not found');
    if (payment.order_id !== attempt.providerOrderId || payment.amount !== this.toPaise(attempt.amount) || payment.currency !== attempt.currency || payment.status !== 'captured') {
      throw new BadRequestException('Captured payment does not match the saved invoice order');
    }
    if (attempt.status === PaymentAttemptStatus.PAID) {
      if (attempt.paymentId !== payment.id) throw new ConflictException('This order was recorded with a different payment');
      return this.prisma.invoice.findUnique({ where: { id: attempt.invoiceId }, include: { payments: true } });
    }
    if (attempt.status !== PaymentAttemptStatus.CREATED) throw new ConflictException('This payment order is no longer active');
    if (![InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE].includes(attempt.invoice.status)) {
      throw new ConflictException('Invoice is no longer payable');
    }

    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: PaymentAttemptStatus.CREATED, paymentId: null },
        data: { status: PaymentAttemptStatus.PAID, paymentId: payment.id, method: payment.method ?? null },
      });
      if (claimed.count !== 1) {
        const current = await tx.paymentAttempt.findUnique({ where: { id: attempt.id } });
        if (current?.status === PaymentAttemptStatus.PAID && current.paymentId === payment.id) {
          return tx.invoice.findUnique({ where: { id: attempt.invoiceId }, include: { payments: true } });
        }
        throw new ConflictException('This payment order was processed concurrently');
      }

      await tx.payment.create({
        data: {
          invoiceId: attempt.invoiceId,
          method: 'OTHER',
          amount: attempt.amount,
          reference: payment.id,
          note: `Razorpay (${payment.method ?? 'online'})`,
        },
      });
      const paid = attempt.invoice.payments.reduce((sum, item) => sum.plus(item.amount), new Prisma.Decimal(0)).plus(attempt.amount);
      if (paid.gte(attempt.invoice.total) && canTransition(invoiceTransitions, attempt.invoice.status, InvoiceStatus.PAID)) {
        await tx.invoice.updateMany({
          where: { id: attempt.invoiceId, status: attempt.invoice.status },
          data: { status: InvoiceStatus.PAID },
        });
      }
      return tx.invoice.findUnique({ where: { id: attempt.invoiceId }, include: { payments: true } });
    });
  }

  private checkoutOrder(orderId: string, amount: Prisma.Decimal, currency: string, customerName: string, customerEmail: string) {
    return { keyId: this.keyId(), orderId, amount: this.toPaise(amount), currency, customerName, customerEmail };
  }

  private toPaise(amount: Prisma.Decimal) { return Math.round(Number(amount.toFixed(2)) * 100); }

  private keyId() {
    const value = this.config.get<string>('RAZORPAY_KEY_ID');
    if (!value) throw new ServiceUnavailableException('Razorpay key ID is not configured');
    return value;
  }

  private keySecret() {
    const value = this.config.get<string>('RAZORPAY_KEY_SECRET');
    if (!value) throw new ServiceUnavailableException('Razorpay key secret is not configured');
    return value;
  }

  private async razorpayRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
    const credentials = Buffer.from(`${this.keyId()}:${this.keySecret()}`).toString('base64');
    const response = await fetch(`https://api.razorpay.com/v1${path}`, {
      ...init,
      headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/json', ...init.headers },
    });
    const result = await response.json() as T & { error?: { description?: string } };
    if (!response.ok) {
      throw new BadRequestException(result.error?.description ?? 'Razorpay request failed');
    }
    return result;
  }
}
