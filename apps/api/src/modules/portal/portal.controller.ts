import { Controller, ForbiddenException, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus, Prisma } from '@prisma/client';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('customer portal')
@ApiBearerAuth('access-token')
@Controller('portal')
export class PortalController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('invoices')
  @ApiOperation({ summary: 'List invoices belonging to the signed-in customer' })
  async invoices(@CurrentUser() user: AuthenticatedUser) {
    const customerId = this.customerId(user);
    const invoices = await this.prisma.invoice.findMany({
      where: { customerId },
      include: { lines: true, payments: true },
      orderBy: { issueDate: 'desc' },
    });
    return invoices.map((invoice) => ({
      id: invoice.id,
      number: `INV-${String(invoice.number).padStart(6, '0')}`,
      subscriptionId: invoice.subscriptionId,
      status: invoice.status,
      isOverdue: invoice.status === InvoiceStatus.OVERDUE || (invoice.status === InvoiceStatus.CONFIRMED && invoice.dueDate < new Date()),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      subtotal: invoice.subtotal,
      discountTotal: invoice.discountTotal,
      taxTotal: invoice.taxTotal,
      total: invoice.total,
      amountPaid: invoice.amountPaid,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discountAmount: line.discountAmount,
        taxAmount: line.taxAmount,
        amount: line.totalAmount,
      })),
    }));
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions belonging to the signed-in customer' })
  async subscriptions(@CurrentUser() user: AuthenticatedUser) {
    const customerId = this.customerId(user);
    const subscriptions = await this.prisma.subscription.findMany({
      where: { customerId },
      include: { plan: true, lines: { include: { product: true, variant: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return subscriptions.map((subscription) => ({
      id: subscription.id,
      number: subscription.number,
      status: subscription.status,
      planName: subscription.plan.name,
      billingPeriod: subscription.plan.billingPeriod,
      startDate: subscription.startDate,
      expiryDate: subscription.expiryDate,
      nextBillingDate: subscription.nextBillingDate,
      allowEarlyClose: subscription.plan.allowEarlyClose,
      allowPause: subscription.plan.allowPause,
      allowRenew: subscription.plan.allowRenew,
      totalAmount: subscription.lines.reduce((sum, line) => sum.plus(line.totalAmount), new Prisma.Decimal(0)),
      lines: subscription.lines.map((line) => ({
        id: line.id,
        productId: line.productId,
        productName: line.product.name,
        variantId: line.variantId,
        variantName: line.variant ? `${line.variant.attribute}: ${line.variant.value}` : null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        amount: line.subtotal,
        taxAmount: line.taxAmount,
      })),
    }));
  }

  private customerId(user: AuthenticatedUser) {
    if (!user.customerId) throw new ForbiddenException('Customer account required');
    return user.customerId;
  }
}
