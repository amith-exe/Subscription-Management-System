import { Injectable } from '@nestjs/common';
import { InvoiceStatus, Prisma, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const money = (value: Prisma.Decimal | number): number => Number(value);

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary() {
    const [active, invoices] = await Promise.all([
      this.prisma.subscription.findMany({ where: { status: SubscriptionStatus.ACTIVE }, include: { plan: true } }),
      this.prisma.invoice.findMany({ where: { status: { in: [InvoiceStatus.CONFIRMED, InvoiceStatus.PAID] } }, select: { total: true, amountPaid: true, dueDate: true, status: true } }),
    ]);
    const mrr = active.reduce((sum, subscription) => {
      const amount = money(subscription.plan.price);
      return sum + (subscription.plan.billingPeriod === 'YEARLY' ? amount / 12 : amount);
    }, 0);
    const revenueCollected = invoices.reduce((sum, invoice) => sum + money(invoice.amountPaid), 0);
    const outstanding = invoices.reduce((sum, invoice) => sum + Math.max(0, money(invoice.total) - money(invoice.amountPaid)), 0);
    const overdueInvoices = invoices.filter((invoice) => invoice.status === InvoiceStatus.CONFIRMED && invoice.dueDate < new Date() && money(invoice.total) > money(invoice.amountPaid)).length;
    return { mrr, activeSubscriptions: active.length, revenueCollected, outstanding, overdueInvoices, churnRate: 0 };
  }

  async mrrMovement() {
    const subscriptions = await this.prisma.subscription.findMany({ include: { plan: true } });
    const active = subscriptions.filter((subscription) => subscription.status === SubscriptionStatus.ACTIVE);
    const monthly = (subscription: (typeof subscriptions)[number]) => {
      const value = money(subscription.plan.price);
      return subscription.plan.billingPeriod === 'YEARLY' ? value / 12 : value;
    };
    const endingMrr = active.reduce((sum, subscription) => sum + monthly(subscription), 0);
    const newMrr = active.filter((subscription) => subscription.createdAt >= new Date(new Date().getFullYear(), new Date().getMonth(), 1)).reduce((sum, subscription) => sum + monthly(subscription), 0);
    return { month: new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' }), startingMrr: endingMrr - newMrr, newMrr, expansionMrr: 0, contractionMrr: 0, churnedMrr: 0, endingMrr };
  }

  async aging() {
    const invoices = await this.prisma.invoice.findMany({ where: { status: InvoiceStatus.CONFIRMED }, select: { total: true, amountPaid: true, dueDate: true } });
    const buckets = [{ bucket: '0-30', amount: 0, invoiceCount: 0 }, { bucket: '31-60', amount: 0, invoiceCount: 0 }, { bucket: '61-90', amount: 0, invoiceCount: 0 }, { bucket: '90+', amount: 0, invoiceCount: 0 }];
    for (const invoice of invoices) {
      const balance = Math.max(0, money(invoice.total) - money(invoice.amountPaid));
      if (!balance) continue;
      const days = Math.max(0, Math.floor((Date.now() - invoice.dueDate.getTime()) / 86400000));
      const index = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;
      buckets[index].amount += balance;
      buckets[index].invoiceCount += 1;
    }
    return buckets;
  }

  async topPlans() {
    const subscriptions = await this.prisma.subscription.findMany({ where: { status: SubscriptionStatus.ACTIVE }, include: { plan: true } });
    const grouped = new Map<string, { planId: string; planName: string; subscriberCount: number; mrr: number }>();
    for (const subscription of subscriptions) {
      const current = grouped.get(subscription.planId) ?? { planId: subscription.planId, planName: subscription.plan.name, subscriberCount: 0, mrr: 0 };
      current.subscriberCount += 1;
      current.mrr += money(subscription.plan.price) / (subscription.plan.billingPeriod === 'YEARLY' ? 12 : 1);
      grouped.set(subscription.planId, current);
    }
    const total = [...grouped.values()].reduce((sum, plan) => sum + plan.mrr, 0);
    return [...grouped.values()].sort((a, b) => b.mrr - a.mrr).map((plan) => ({ ...plan, percentage: total ? (plan.mrr / total) * 100 : 0 }));
  }
}