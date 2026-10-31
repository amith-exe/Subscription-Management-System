import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, PaymentAttemptStatus, PaymentMethod, Prisma } from '@prisma/client';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { canTransition, invoiceTransitions } from '../../common/state/transitions';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedUser } from '../auth/auth.types';
import { CreatePaymentDto, ListPaymentsQueryDto, VerifyRazorpayPaymentDto } from './payments.dto';

export type PaymentFilters = {
  page?: number;
  pageSize?: number;
  method?: PaymentMethod;
  invoiceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
};

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

  async create(input: CreatePaymentDto) {
    const amount = new Prisma.Decimal(input.amount);
    if (!amount.isFinite() || amount.lte(0)) throw new BadRequestException('Payment amount must be greater than zero');

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${input.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({ where: { id: input.invoiceId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status === InvoiceStatus.DRAFT || invoice.status === InvoiceStatus.CANCELLED) {
        throw new BadRequestException(`Cannot record payment for a ${invoice.status.toLowerCase()} invoice`);
      }

      const outstanding = invoice.total.minus(invoice.amountPaid);
      if (amount.gt(outstanding)) throw new BadRequestException('Payment amount exceeds the outstanding invoice balance');
      if (outstanding.lte(0)) throw new BadRequestException('Invoice has no outstanding balance');

      const amountPaid = invoice.amountPaid.plus(amount);
      const settled = amountPaid.gte(invoice.total);
      if (settled && !canTransition(invoiceTransitions, invoice.status, InvoiceStatus.PAID)) {
        throw new BadRequestException(`Cannot mark invoice ${invoice.status} as paid`);
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          method: input.method,
          amount,
          paidAt: new Date(input.date),
          note: input.note,
        },
      });
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: { amountPaid, ...(settled && { status: InvoiceStatus.PAID }) },
      });
      return {
        ...payment,
        invoice: {
          ...updatedInvoice,
          outstandingAmount: Prisma.Decimal.max(updatedInvoice.total.minus(updatedInvoice.amountPaid), 0),
        },
      };
    });
  }

  async list(filters: PaymentFilters = {}) {
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 20)));
    const where: Prisma.PaymentWhereInput = {
      ...(filters.invoiceId && { invoiceId: filters.invoiceId }),
      ...(filters.method && { method: filters.method }),
      ...((filters.dateFrom || filters.dateTo) && { paidAt: {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      } }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.payment.findMany({ where, include: { invoice: true }, orderBy: { paidAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.payment.count({ where }),
    ]);
    return {
      data: data.map((payment) => ({
        ...payment,
        invoice: {
          ...payment.invoice,
          outstandingAmount: Prisma.Decimal.max(payment.invoice.total.minus(payment.invoice.amountPaid), 0),
        },
      })),
      total,
      page,
      pageSize,
    };
  }

  async forInvoice(invoiceId: string, query: ListPaymentsQueryDto) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId }, select: { id: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return this.list({
      ...query,
      invoiceId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });
  }

  async createOrder(user: AuthenticatedUser, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { customer: { include: { user: true } } },
    });
    if (!invoice || !user.customerId || invoice.customerId !== user.customerId) {
      throw new NotFoundException('Invoice not found');
    }
    const isPayable = invoice.status === InvoiceStatus.CONFIRMED || invoice.status === InvoiceStatus.OVERDUE;
    const outstanding = invoice.total.minus(invoice.amountPaid);
    const existing = await this.prisma.paymentAttempt.findFirst({
      where: { invoiceId, status: PaymentAttemptStatus.CREATED },
    });
    if (existing && (!isPayable || outstanding.lte(0) || !existing.amount.eq(outstanding))) {
      await this.prisma.paymentAttempt.updateMany({ where: { id: existing.id, status: PaymentAttemptStatus.CREATED }, data: { status: PaymentAttemptStatus.FAILED } });
    }
    if (!isPayable) throw new BadRequestException('Only confirmed, unpaid invoices can be paid online');
    if (outstanding.lte(0)) throw new BadRequestException('Invoice has no outstanding balance');
    if (existing?.amount.eq(outstanding)) return this.checkoutOrder(existing.providerOrderId, existing.amount, existing.currency, invoice.customer.name, invoice.customer.user.email);

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
    if (attempt.status === PaymentAttemptStatus.FAILED) throw new ConflictException('This payment order is no longer active');
    if (attempt.status === PaymentAttemptStatus.PAID && attempt.paymentId !== input.razorpay_payment_id) throw new ConflictException('This payment order was recorded with a different payment');

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

  private async recordCapturedPayment(orderId: string, payment: RazorpayPayment) {
    const attempt = await this.prisma.paymentAttempt.findUnique({
      where: { providerOrderId: orderId },
      include: { invoice: true },
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
    if (attempt.invoice.status !== InvoiceStatus.CONFIRMED && attempt.invoice.status !== InvoiceStatus.OVERDUE) {
      throw new ConflictException('Invoice is no longer payable');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Invoice" WHERE "id" = ${attempt.invoiceId} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({ where: { id: attempt.invoiceId } });
      if (!invoice) throw new NotFoundException('Invoice not found');
      if (invoice.status !== InvoiceStatus.CONFIRMED && invoice.status !== InvoiceStatus.OVERDUE) {
        throw new ConflictException('Invoice is no longer payable');
      }
      const outstanding = invoice.total.minus(invoice.amountPaid);
      if (attempt.amount.gt(outstanding)) throw new ConflictException('Payment order exceeds the current outstanding invoice balance');

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
          method: PaymentMethod.OTHER,
          amount: attempt.amount,
          reference: payment.id,
          note: `Razorpay (${payment.method ?? 'online'})`,
        },
      });
      const amountPaid = invoice.amountPaid.plus(attempt.amount);
      const settled = amountPaid.gte(invoice.total);
      await tx.invoice.update({
        where: { id: attempt.invoiceId },
        data: { amountPaid, ...(settled && canTransition(invoiceTransitions, invoice.status, InvoiceStatus.PAID) && { status: InvoiceStatus.PAID }) },
      });
      if (settled && !canTransition(invoiceTransitions, invoice.status, InvoiceStatus.PAID)) {
        throw new ConflictException(`Cannot mark invoice ${invoice.status} as paid`);
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
