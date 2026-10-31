import { Injectable, Logger, OnModuleDestroy, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillingPeriod, DiscountScope, InvoiceStatus, Prisma, SubscriptionStatus, TaxType } from '@prisma/client';
import { Queue, Worker } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { DiscountEngine } from './discount-engine';

const QUEUE_NAME = 'subscription-billing';
const MAX_CATCH_UP_PERIODS = 1200;
type BillingJob = { type: 'subscription'; subscriptionId: string } | { type: 'overdue-reminders' };

export function nextPeriodDate(date: Date, period: BillingPeriod, anchor = date): Date {
  const next = new Date(date);
  if (period === BillingPeriod.DAILY) next.setUTCDate(next.getUTCDate() + 1);
  else if (period === BillingPeriod.WEEKLY) next.setUTCDate(next.getUTCDate() + 7);
  else {
    const months = period === BillingPeriod.MONTHLY ? 1 : 12;
    const day = anchor.getUTCDate();
    next.setUTCDate(1);
    next.setUTCMonth(next.getUTCMonth() + months);
    if (period === BillingPeriod.YEARLY) next.setUTCMonth(anchor.getUTCMonth());
    const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
    next.setUTCDate(Math.min(day, lastDay));
  }
  return next;
}

@Injectable()
export class BillingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BillingService.name);
  private queue?: Queue<BillingJob>;
  private worker?: Worker<BillingJob>;

  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  onModuleInit() {
    if (process.env.QUEUE_ENABLED !== 'true') {
      this.logger.warn('Billing worker disabled; set QUEUE_ENABLED=true and configure REDIS_URL.');
      return;
    }
    const connection = this.redisConnection();
    this.queue = new Queue<BillingJob>(QUEUE_NAME, { connection });
    this.worker = new Worker<BillingJob>(QUEUE_NAME, (job) => job.data.type === 'subscription'
      ? this.billDuePeriods(job.data.subscriptionId)
      : this.sendOverdueReminders(), { connection, concurrency: 20 });
    this.worker.on('failed', (job, error) => this.logger.error(`Billing job ${job?.id ?? 'unknown'} failed: ${error.message}`));
    this.worker.on('error', (error) => this.logger.error(`Billing worker error: ${error.message}`));
  }

  async onModuleDestroy() { await Promise.all([this.worker?.close(), this.queue?.close()]); }

  @Cron('0 2 * * *')
  async nightlyBilling() {
    if (!this.queue) return;
    try {
      const result = await this.enqueueDueSubscriptions();
      this.logger.log(`Queued ${result.queued} due subscription(s).`);
    } catch (error) {
      this.logger.error(`Nightly billing enqueue failed: ${this.errorMessage(error)}`);
    }
  }

  @Cron('0 8 * * *')
  async dailyOverdueReminders() {
    if (!this.queue) return;
    const day = new Date().toISOString().slice(0, 10);
    await this.queue.add('overdue-reminders', { type: 'overdue-reminders' }, {
      jobId: `overdue-reminders-${day}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { age: 604800, count: 10000 },
      removeOnFail: { age: 2592000 },
    });
  }

  async enqueueDueSubscriptions(now = new Date()) {
    if (!this.queue) throw new ServiceUnavailableException('Billing queue is disabled. Set QUEUE_ENABLED=true and configure Redis.');
    await this.closeExpiredSubscriptions(now);
    const subscriptions = await this.prisma.subscription.findMany({
      where: { status: SubscriptionStatus.ACTIVE, nextBillingDate: { lte: now } },
      select: { id: true, nextBillingDate: true },
      orderBy: { nextBillingDate: 'asc' },
    });
    if (!subscriptions.length) return { queued: 0 };
    await this.queue.addBulk(subscriptions.map((subscription) => ({
      name: 'bill-subscription',
      data: { type: 'subscription' as const, subscriptionId: subscription.id },
      opts: {
        jobId: `bill-${subscription.id}-${subscription.nextBillingDate!.getTime()}`,
        attempts: 5,
        backoff: { type: 'exponential' as const, delay: 1000 },
        removeOnComplete: { age: 604800, count: 10000 },
        removeOnFail: { age: 2592000 },
      },
    })));
    return { queued: subscriptions.length };
  }

  async billDuePeriods(subscriptionId: string, now = new Date()) {
    let billed = 0;
    for (let i = 0; i < MAX_CATCH_UP_PERIODS; i += 1) {
      const result = await this.billOnePeriod(subscriptionId, now);
      if (result === 'done') return { subscriptionId, billed };
      billed += 1;
    }
    throw new Error(`Subscription ${subscriptionId} exceeded the billing catch-up limit`);
  }

  private async closeExpiredSubscriptions(now: Date) {
    await this.prisma.$executeRaw`UPDATE "Subscription" AS subscription SET "status" = 'CLOSED'
      FROM "Plan" AS plan
      WHERE subscription."planId" = plan."id" AND subscription."status" = 'ACTIVE'
        AND plan."autoClose" = true AND subscription."expiryDate" IS NOT NULL
        AND subscription."expiryDate" <= ${now}
        AND (subscription."nextBillingDate" IS NULL OR subscription."nextBillingDate" >= subscription."expiryDate")`;
  }

  private async billOnePeriod(subscriptionId: string, now: Date): Promise<'done' | 'billed'> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Subscription" WHERE "id" = ${subscriptionId} FOR UPDATE`;
      const subscription = await tx.subscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true, lines: { include: { product: true, variant: true, tax: true } } },
      });
      if (!subscription || subscription.status !== SubscriptionStatus.ACTIVE || !subscription.nextBillingDate || subscription.nextBillingDate > now) return 'done';
      const periodStart = subscription.nextBillingDate;
      if (subscription.plan.autoClose && subscription.expiryDate && periodStart >= subscription.expiryDate) {
        await tx.subscription.update({ where: { id: subscription.id }, data: { status: SubscriptionStatus.CLOSED } });
        return 'done';
      }
      const cadenceEnd = nextPeriodDate(periodStart, subscription.plan.billingPeriod, subscription.startDate);
      const periodEnd = subscription.plan.autoClose && subscription.expiryDate && subscription.expiryDate < cadenceEnd
        ? subscription.expiryDate : cadenceEnd;
      const invoiceKey = { subscriptionId: subscription.id, periodStart, periodEnd };
      const exists = await tx.invoice.findUnique({ where: { subscriptionId_periodStart_periodEnd: invoiceKey }, select: { id: true } });
      if (!exists) await this.createInvoice(tx, subscription, periodStart, periodEnd);
      const closed = Boolean(subscription.plan.autoClose && subscription.expiryDate && periodEnd >= subscription.expiryDate);
      await tx.subscription.update({ where: { id: subscription.id }, data: { nextBillingDate: periodEnd, ...(closed && { status: SubscriptionStatus.CLOSED }) } });
      return 'billed';
    }, { maxWait: 10000, timeout: 30000 });
  }

  private async createInvoice(
    tx: Prisma.TransactionClient,
    subscription: Prisma.SubscriptionGetPayload<{ include: { plan: true; lines: { include: { product: true; variant: true; tax: true } } } }>,
    periodStart: Date,
    periodEnd: Date,
  ) {
    if (!subscription.lines.length) throw new Error(`Subscription ${subscription.id} has no invoice lines`);
    const draftLines = subscription.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, amount: line.subtotal }));
    const subtotal = draftLines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    const productIds = [...new Set(draftLines.map((line) => line.productId))];
    const candidates = await tx.discount.findMany({
      where: {
        isActive: true,
        startDate: { lte: periodStart },
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: periodStart } }] },
          { OR: [
            { appliesTo: DiscountScope.SUBSCRIPTION, subscriptions: { some: { subscriptionId: subscription.id } } },
            { appliesTo: DiscountScope.PRODUCT, products: { some: { productId: { in: productIds } } } },
          ] },
        ],
      },
      include: { products: true, subscriptions: true },
    });
    const proposals = DiscountEngine.calculate({ subscriptionId: subscription.id, lines: draftLines, date: periodStart }, candidates.map((item) => ({
      ...item, active: item.isActive, products: item.products, subscriptions: item.subscriptions,
    })));
    const discounts = new Map(candidates.map((item) => [item.id, item]));
    const lineDiscounts = subscription.lines.map(() => new Prisma.Decimal(0));
    const appliedDiscounts: Array<{ id: string; amount: Prisma.Decimal }> = [];
    for (const proposal of proposals) {
      const discount = discounts.get(proposal.discountId);
      if (!discount) continue;
      const eligible = subscription.lines.flatMap((line, index) => discount.appliesTo === DiscountScope.SUBSCRIPTION || discount.products.some((p) => p.productId === line.productId) ? [index] : []);
      const bases = eligible.map((index) => Prisma.Decimal.max(subscription.lines[index].subtotal.minus(lineDiscounts[index]), 0));
      const eligibleTotal = bases.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0));
      const amount = Prisma.Decimal.min(new Prisma.Decimal(proposal.amount.toString()), eligibleTotal).toDecimalPlaces(2);
      if (amount.lte(0)) continue;
      const reserved = await tx.$executeRaw`UPDATE "Discount" SET "usedCount" = "usedCount" + 1 WHERE "id" = ${discount.id} AND "isActive" = true AND "startDate" <= ${periodStart} AND ("endDate" IS NULL OR "endDate" >= ${periodStart}) AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
      if (reserved !== 1) continue;
      appliedDiscounts.push({ id: discount.id, amount });
      let distributed = new Prisma.Decimal(0);
      eligible.forEach((lineIndex, position) => {
        const share = position === eligible.length - 1 ? amount.minus(distributed) : (eligibleTotal.gt(0) ? amount.mul(bases[position]).div(eligibleTotal).toDecimalPlaces(2) : new Prisma.Decimal(0));
        lineDiscounts[lineIndex] = lineDiscounts[lineIndex].plus(share);
        distributed = distributed.plus(share);
      });
    }

    const invoiceLines = subscription.lines.map((line, index) => {
      const discountAmount = lineDiscounts[index].toDecimalPlaces(2);
      const taxable = Prisma.Decimal.max(line.subtotal.minus(discountAmount), 0);
      const taxRate = line.tax?.rate ?? line.taxRate;
      const taxAmount = line.tax?.type === TaxType.FIXED ? taxRate.mul(line.quantity).toDecimalPlaces(2) : taxable.mul(taxRate).div(100).toDecimalPlaces(2);
      const variant = line.variant ? ` (${line.variant.attribute}: ${line.variant.value})` : '';
      return { productId: line.productId, description: `${line.product.name}${variant}`, quantity: line.quantity, unitPrice: line.unitPrice, subtotal: line.subtotal, taxRate, discountAmount, taxAmount, totalAmount: taxable.plus(taxAmount).toDecimalPlaces(2) };
    });
    const discountTotal = lineDiscounts.reduce((sum, amount) => sum.plus(amount), new Prisma.Decimal(0)).toDecimalPlaces(2);
    const taxTotal = invoiceLines.reduce((sum, line) => sum.plus(line.taxAmount), new Prisma.Decimal(0)).toDecimalPlaces(2);
    const total = subtotal.minus(discountTotal).plus(taxTotal).toDecimalPlaces(2);
    const dueDate = new Date(periodEnd);
    dueDate.setUTCDate(dueDate.getUTCDate() + Number(subscription.paymentTerms.match(/\d+/)?.[0] ?? 0));
    const invoice = await tx.invoice.create({ data: {
      number: `INV-${subscription.number}-${periodStart.getTime()}`,
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      status: InvoiceStatus.CONFIRMED,
      issueDate: new Date(),
      dueDate,
      periodStart,
      periodEnd,
      subtotal: subtotal.toDecimalPlaces(2),
      taxTotal,
      discountTotal,
      total,
      lines: { create: invoiceLines },
    }, select: { id: true } });
    for (const applied of appliedDiscounts) await tx.discountUsage.create({ data: { discountId: applied.id, invoiceId: invoice.id, amountApplied: applied.amount } });
  }

  private async sendOverdueReminders() {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.OVERDUE] }, dueDate: { lt: new Date() } },
      include: { customer: { include: { user: true } }, payments: { select: { amount: true } } },
    });
    const outcomes = await Promise.allSettled(invoices.map((invoice) => this.notifications.sendOverdueReminder(
      invoice.customer.user.email, invoice.number, invoice.dueDate, invoice.total,
      invoice.payments.reduce((sum, payment) => sum.plus(payment.amount), new Prisma.Decimal(0)),
    )));
    const failed = outcomes.filter((item) => item.status === 'rejected').length;
    this.logger.log(`Overdue reminders sent ${outcomes.length - failed}; failed ${failed}.`);
  }

  private redisConnection() {
    const url = new URL(process.env.REDIS_URL ?? 'redis://localhost:6379');
    return { host: url.hostname, port: Number(url.port || 6379), ...(url.username && { username: decodeURIComponent(url.username) }), ...(url.password && { password: decodeURIComponent(url.password) }), ...(url.protocol === 'rediss:' && { tls: {} }), maxRetriesPerRequest: null };
  }

  private errorMessage(error: unknown) { return error instanceof Error ? error.message : String(error); }
}
