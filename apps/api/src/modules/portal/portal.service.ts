import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CloseSubscriptionResponseDto,
  PortalInvoiceResponseDto,
  PortalSubscriptionResponseDto,
} from './dto/portal.dto';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all subscriptions belonging strictly to the authenticated customer.
   */
  async getSubscriptions(customerId: string): Promise<PortalSubscriptionResponseDto[]> {
    const subs = await this.prisma.subscription.findMany({
      where: { customerId },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return subs.map((s) => this.mapSubscription(s));
  }

  /**
   * Get full details of a specific subscription, enforcing strict tenant isolation.
   */
  async getSubscription(customerId: string, subscriptionId: string): Promise<PortalSubscriptionResponseDto> {
    const s = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        customerId,
      },
      include: {
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!s) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    return this.mapSubscription(s);
  }

  /**
   * List all invoices belonging strictly to the authenticated customer.
   */
  async getInvoices(customerId: string): Promise<PortalInvoiceResponseDto[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { customerId },
      include: {
        lines: true,
        payments: true,
        subscription: {
          select: { number: true },
        },
      },
      orderBy: { issueDate: 'desc' },
    });

    return invoices.map((inv) => this.mapInvoice(inv));
  }

  /**
   * Get single invoice detail with strict tenant isolation.
   */
  async getInvoice(customerId: string, invoiceId: string): Promise<PortalInvoiceResponseDto> {
    const inv = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        customerId,
      },
      include: {
        lines: true,
        payments: true,
        subscription: {
          select: { number: true },
        },
      },
    });

    if (!inv) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return this.mapInvoice(inv);
  }

  /**
   * Generates formatted PDF receipt payload for an authorized customer invoice.
   */
  async getInvoicePdf(customerId: string, invoiceId: string) {
    const inv = await this.prisma.invoice.findFirst({
      where: {
        id: invoiceId,
        customerId,
      },
      include: {
        lines: true,
        payments: true,
        customer: true,
        subscription: {
          include: { plan: true },
        },
      },
    });

    if (!inv) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    // Build standard structured invoice receipt representation
    const amountPaid = inv.payments.reduce((acc, p) => acc + Number(p.amount), 0);
    const balanceDue = Math.max(0, Number(inv.total) - amountPaid);

    return {
      metadata: {
        invoiceNumber: inv.number,
        generatedAt: new Date().toISOString(),
        issuer: 'Brightloop ERP Platform',
        taxRegistration: 'GST-BRIGHTLOOP-2026',
      },
      customer: {
        id: inv.customer.id,
        name: inv.customer.name,
        company: inv.customer.company ?? inv.customer.name,
        taxId: inv.customer.taxId ?? 'N/A',
      },
      dates: {
        issueDate: inv.issueDate,
        dueDate: inv.dueDate,
        periodStart: inv.periodStart,
        periodEnd: inv.periodEnd,
      },
      totals: {
        subtotal: Number(inv.subtotal),
        discountTotal: Number(inv.discountTotal),
        taxTotal: Number(inv.taxTotal),
        total: Number(inv.total),
        amountPaid,
        balanceDue,
        status: inv.status,
      },
      lines: inv.lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        subtotal: Number(l.subtotal),
        taxAmount: Number(l.taxAmount),
        discountAmount: Number(l.discountAmount),
        totalAmount: Number(l.totalAmount),
      })),
      payments: inv.payments.map((p) => ({
        method: p.method,
        amount: Number(p.amount),
        date: p.paidAt ?? p.createdAt,
        note: p.note,
      })),
    };
  }

  /**
   * Early cancel subscription: allowed ONLY if the plan's allowEarlyClose policy flag is enabled.
   */
  async closeSubscription(customerId: string, subscriptionId: string): Promise<CloseSubscriptionResponseDto> {
    const sub = await this.prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        customerId,
      },
      include: {
        plan: true,
      },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription ${subscriptionId} not found`);
    }

    if (sub.status === SubscriptionStatus.CLOSED) {
      return {
        id: sub.id,
        number: sub.number,
        status: sub.status,
        message: 'Subscription is already closed',
      };
    }

    // Enforce Plan policy flag
    if (!sub.plan.allowEarlyClose) {
      throw new BadRequestException(
        'Plan policy does not permit early cancellation (allowEarlyClose is disabled for this plan)',
      );
    }

    const updated = await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        status: SubscriptionStatus.CLOSED,
        updatedAt: new Date(),
      },
    });

    return {
      id: updated.id,
      number: updated.number,
      status: updated.status,
      message: 'Subscription successfully closed by customer request',
    };
  }

  private mapSubscription(s: any): PortalSubscriptionResponseDto {
    const lines = s.lines.map((l: any) => {
      const variantLabel = l.variant
        ? `${l.variant.attribute}: ${l.variant.value} (+₹${Number(l.variant.extraPrice).toFixed(2)})`
        : null;

      return {
        id: l.id,
        productId: l.productId,
        productName: l.product?.name ?? 'Brightloop ERP Platform',
        variantId: l.variantId,
        variantLabel,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        taxAmount: Number(l.taxAmount),
        subtotal: Number(l.subtotal),
        totalAmount: Number(l.totalAmount),
      };
    });

    const totalAmount = lines.reduce((acc: number, cur: any) => acc + cur.totalAmount, 0);

    return {
      id: s.id,
      number: s.number,
      planId: s.planId,
      planName: s.plan?.name ?? 'Standard Plan',
      billingPeriod: s.plan?.billingPeriod,
      status: s.status,
      allowEarlyClose: s.plan?.allowEarlyClose ?? false,
      startDate: s.startDate,
      nextBillingDate: s.nextBillingDate,
      paymentTerms: s.paymentTerms,
      lines,
      totalAmount,
    };
  }

  private mapInvoice(inv: any): PortalInvoiceResponseDto {
    const isOverdue =
      inv.status === InvoiceStatus.CONFIRMED && new Date(inv.dueDate) < new Date();

    const amountPaid = (inv.payments || []).reduce(
      (acc: number, p: any) => acc + Number(p.amount),
      0,
    );

    return {
      id: inv.id,
      number: inv.number,
      subscriptionId: inv.subscriptionId,
      subscriptionNumber: inv.subscription?.number ?? 'N/A',
      status: isOverdue ? InvoiceStatus.OVERDUE : inv.status,
      isOverdue,
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      subtotal: Number(inv.subtotal),
      taxTotal: Number(inv.taxTotal),
      discountTotal: Number(inv.discountTotal),
      total: Number(inv.total),
      amountPaid,
      lines: (inv.lines || []).map((l: any) => ({
        id: l.id,
        description: l.description,
        quantity: l.quantity,
        unitPrice: Number(l.unitPrice),
        subtotal: Number(l.subtotal),
        taxAmount: Number(l.taxAmount),
        discountAmount: Number(l.discountAmount),
        totalAmount: Number(l.totalAmount),
      })),
    };
  }
}
