import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountScope, InvoiceStatus, Prisma, TaxType } from '@prisma/client';
import { DiscountEngine, DraftInvoiceLine } from '../billing/discount-engine';
import { DiscountsService } from '../discounts/discounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../../prisma/prisma.service';
import { canTransition, invoiceTransitions } from '../../common/state/transitions';

export type InvoicePeriod = { start: Date; end: Date };
export type InvoiceFilters = {
  status?: InvoiceStatus;
  customerId?: string;
  overdue?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
};

type PdfDocument = {
  fontSize(size: number): PdfDocument;
  text(value: string, options?: Record<string, unknown>): PdfDocument;
  moveDown(lines?: number): PdfDocument;
  end(): void;
  on(event: 'data', listener: (chunk: Buffer) => void): PdfDocument;
  on(event: 'end', listener: () => void): PdfDocument;
  on(event: 'error', listener: (error: Error) => void): PdfDocument;
};
type PdfKitConstructor = new () => PdfDocument;

const invoiceInclude = {
  customer: { include: { user: true } },
  subscription: true,
  lines: true,
  payments: true,
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly discounts: DiscountsService,
    private readonly notifications: NotificationsService,
  ) {}

  async createFromSubscription(subscriptionId: string, period: InvoicePeriod) {
    if (period.start >= period.end) throw new BadRequestException('Invoice period start must be before end');
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: {
        customer: true,
        lines: { include: { product: true, variant: true, tax: true } },
      },
    });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const lines: DraftInvoiceLine[] = subscription.lines.map((line) => ({
      productId: line.productId,
      quantity: line.quantity,
      amount: line.subtotal,
    }));
    const subtotal = lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    const candidates = await this.discounts.getApplicable(subscriptionId, period.start);
    const proposed = DiscountEngine.calculate({ subscriptionId, lines, date: period.start }, candidates);

    return this.prisma.$transaction(async (tx) => {
      const reserved: typeof proposed = [];
      for (const discount of proposed) {
        const updated = await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = "usedCount" + 1 WHERE "id" = ${discount.discountId} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
        if (updated === 1) reserved.push(discount);
      }

      const discountsById = new Map(candidates.map((discount) => [discount.id, discount]));
      const lineDiscounts = subscription.lines.map(() => new Prisma.Decimal(0));
      for (const applied of reserved) {
        const discount = discountsById.get(applied.discountId);
        if (!discount || applied.amount.lte(0)) continue;
        const eligibleIndexes = subscription.lines.flatMap((line, index) =>
          discount.appliesTo === DiscountScope.SUBSCRIPTION || discount.products.some((entry) => entry.productId === line.productId) ? [index] : []);
        const remaining = eligibleIndexes.map((index) => Prisma.Decimal.max(subscription.lines[index].subtotal.minus(lineDiscounts[index]), 0));
        const eligibleSubtotal = remaining.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));
        const allocatedTotal = Prisma.Decimal.min(applied.amount, eligibleSubtotal).toDecimalPlaces(4);
        let allocated = new Prisma.Decimal(0);
        eligibleIndexes.forEach((index, position) => {
          const amount = position === eligibleIndexes.length - 1
            ? allocatedTotal.minus(allocated)
            : (eligibleSubtotal.gt(0) ? allocatedTotal.mul(remaining[position]).div(eligibleSubtotal).toDecimalPlaces(4) : new Prisma.Decimal(0));
          lineDiscounts[index] = lineDiscounts[index].plus(amount);
          allocated = allocated.plus(amount);
        });
      }

      const invoiceLines = subscription.lines.map((line, index) => {
        const lineDiscount = lineDiscounts[index];
        const taxableAmount = Prisma.Decimal.max(line.subtotal.minus(lineDiscount), 0);
        const taxAmount = line.tax
          ? line.tax.type === TaxType.PERCENTAGE
            ? taxableAmount.mul(line.tax.rate).div(100).toDecimalPlaces(4)
            : line.tax.rate.mul(line.quantity).toDecimalPlaces(4)
          : new Prisma.Decimal(0);
        const variant = line.variant ? ` (${line.variant.attribute}: ${line.variant.value})` : '';
        return {
          productId: line.productId,
          description: `${line.product.name}${variant}`,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          subtotal: taxableAmount,
          discountAmount: lineDiscount,
          taxAmount,
          totalAmount: taxableAmount.plus(taxAmount).toDecimalPlaces(4),
        };
      });
      const roundedDiscount = lineDiscounts.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0)).toDecimalPlaces(4);
      const taxTotal = invoiceLines.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0));
      const total = subtotal.minus(roundedDiscount).plus(taxTotal).toDecimalPlaces(4);
      const dueDate = new Date(period.end);
      const netDays = subscription.paymentTerms.match(/\d+/)?.[0];
      if (netDays) dueDate.setDate(dueDate.getDate() + Number(netDays));

      const seq = await tx.sequence.upsert({
        where: { name: 'invoice' },
        update: { currentValue: { increment: 1 } },
        create: { name: 'invoice', prefix: 'INV', currentValue: 1, padding: 6 },
      });
      const invoiceNumber = `${seq.prefix}-${String(seq.currentValue).padStart(seq.padding, '0')}`;

      return tx.invoice.create({ data: {
        number: invoiceNumber,
        subscriptionId,
        customerId: subscription.customerId,
        periodStart: period.start,
        periodEnd: period.end,
        subtotal: subtotal.toDecimalPlaces(4),
        taxTotal: taxTotal.toDecimalPlaces(4),
        discountTotal: roundedDiscount,
        total,
        dueDate,
        lines: { create: invoiceLines },
      }, include: invoiceInclude });
    });
  }

  async list(filters: InvoiceFilters = {}) {
    const page = Math.max(1, Math.floor(filters.page ?? 1));
    const pageSize = Math.min(100, Math.max(1, Math.floor(filters.pageSize ?? 20)));
    const where: Prisma.InvoiceWhereInput = {
      ...(filters.status && { status: filters.status }),
      ...(filters.customerId && { customerId: filters.customerId }),
      ...((filters.dateFrom || filters.dateTo) && { periodStart: {
        ...(filters.dateFrom && { gte: filters.dateFrom }),
        ...(filters.dateTo && { lte: filters.dateTo }),
      } }),
      ...(filters.overdue && { status: InvoiceStatus.CONFIRMED, dueDate: { lt: new Date() } }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({ where, include: invoiceInclude, orderBy: { number: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data: data.map((invoice) => ({ ...invoice, displayNumber: this.displayNumber(invoice.number) })), total, page, pageSize };
  }

  async get(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: invoiceInclude });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return { ...invoice, displayNumber: this.displayNumber(invoice.number) };
  }

  async confirm(id: string) { return this.transition(id, InvoiceStatus.CONFIRMED); }
  async cancel(id: string) { return this.transition(id, InvoiceStatus.CANCELLED); }

  async markPaidIfSettled(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id }, include: { payments: true } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    const settled = invoice.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)).gte(invoice.total);
    if (settled && (invoice.status === InvoiceStatus.CONFIRMED || invoice.status === InvoiceStatus.OVERDUE)) {
      return this.transition(id, InvoiceStatus.PAID);
    }
    return invoice;
  }

  async send(id: string) {
    const invoice = await this.get(id);
    if (invoice.status !== InvoiceStatus.CONFIRMED) throw new BadRequestException('Only confirmed invoices can be sent');
    const pdf = await this.renderPdf(invoice);
    await this.notifications.sendInvoice(invoice.customer.user.email, invoice.displayNumber, pdf);
  }

  async pdf(id: string) {
    const invoice = await this.get(id);
    return { number: invoice.displayNumber, pdf: await this.renderPdf(invoice) };
  }

  private async transition(id: string, to: InvoiceStatus) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (!canTransition(invoiceTransitions, invoice.status, to)) {
      throw new BadRequestException(`Cannot transition invoice from ${invoice.status} to ${to}`);
    }
    const result = await this.prisma.invoice.updateMany({ where: { id, status: invoice.status }, data: { status: to } });
    if (result.count !== 1) throw new BadRequestException('Invoice status changed concurrently; retry the request');
    return this.get(id);
  }

  private displayNumber(number: string | number) {
    if (typeof number === 'string' && number.startsWith('INV-')) return number;
    return `INV-${String(number).padStart(6, '0')}`;
  }

  private async renderPdf(invoice: Awaited<ReturnType<InvoicesService['get']>>) {
    const PdfDocumentConstructor = require('pdfkit') as PdfKitConstructor;
    const document = new PdfDocumentConstructor();
    const chunks: Buffer[] = [];
    return new Promise<Buffer>((resolve, reject) => {
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);
      document.fontSize(20).text(`Invoice ${invoice.displayNumber}`);
      document.moveDown().fontSize(12).text(`Customer: ${invoice.customer.name}`);
      document.text(`Period: ${invoice.periodStart.toISOString().slice(0, 10)} to ${invoice.periodEnd.toISOString().slice(0, 10)}`);
      document.text(`Due: ${invoice.dueDate.toISOString().slice(0, 10)}`).moveDown();
      for (const line of invoice.lines) {
        document.text(`${line.description} | ${line.quantity} × ${Number(line.unitPrice).toFixed(2)} | ${Number(line.totalAmount).toFixed(2)}`);
      }
      document.moveDown().text(`Subtotal: ${Number(invoice.subtotal).toFixed(2)}`);
      document.text(`Discount: ${Number(invoice.discountTotal).toFixed(2)}`);
      document.text(`Tax: ${Number(invoice.taxTotal).toFixed(2)}`);
      document.fontSize(14).text(`Total: ${Number(invoice.total).toFixed(2)}`);
      document.end();
    });
  }
}
