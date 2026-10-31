import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BillingPeriod,
  Prisma,
  Subscription,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { TaxesService } from '../taxes/taxes.service';
import { PlansService } from '../plans/plans.service';
import { QuotationsService } from '../quotations/quotations.service';
import {
  canTransition,
  subscriptionTransitions,
} from '../../common/state/transitions';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { CreateSubscriptionLineDto } from './dto/create-subscription-line.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFiltersDto } from './dto/subscription-filters.dto';

type CalculatedLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: Decimal;
  taxId: string | null;
  taxRate: Decimal;
  taxAmount: Decimal;
  subtotal: Decimal;
  totalAmount: Decimal;
};

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly productsService: ProductsService,
    private readonly taxesService: TaxesService,
    private readonly plansService: PlansService,
    private readonly quotationsService: QuotationsService,
  ) {}

  /**
   * Generates atomic, sequential numbers such as SUB-000123 inside a transaction
   */
  async generateSequenceNumber(tx: PrismaService): Promise<string> {
    const seq = await tx.sequence.upsert({
      where: { name: 'SUBSCRIPTION' },
      update: { currentValue: { increment: 1 } },
      create: {
        name: 'SUBSCRIPTION',
        currentValue: 1,
        prefix: 'SUB-',
        padding: 6,
      },
    });
    return `${seq.prefix}${String(seq.currentValue).padStart(seq.padding, '0')}`;
  }

  /**
   * Calculates prices, subtotals, tax rates, and tax amounts for line items,
   * enforcing the plan's minimum quantity requirements.
   */
  private async calculateLineItems(
    lines: CreateSubscriptionLineDto[],
    planMinQuantity: number,
  ) {
    if (!lines || lines.length === 0) {
      throw new BadRequestException('A subscription must have at least one product line item');
    }

    const calculatedLines: CalculatedLine[] = [];

    for (const line of lines) {
      if (line.quantity < planMinQuantity) {
        throw new BadRequestException(
          `Line item quantity (${line.quantity}) does not meet plan minimum requirement of ${planMinQuantity}`,
        );
      }

      // Base price + variant extraPrice
      const unitPrice = await this.productsService.getPrice(
        line.productId,
        line.variantId,
      );
      const subtotal = unitPrice.mul(line.quantity).toDecimalPlaces(2);

      let taxRate = new Prisma.Decimal(0);
      let taxAmount = new Prisma.Decimal(0);

      if (line.taxId) {
        const taxResult = await this.taxesService.calculate(
          subtotal,
          line.taxId,
          line.quantity,
        );
        taxRate = taxResult.taxRate;
        taxAmount = taxResult.taxAmount;
      }

      const totalAmount = subtotal.plus(taxAmount).toDecimalPlaces(2);

      calculatedLines.push({
        productId: line.productId,
        variantId: line.variantId ?? null,
        quantity: line.quantity,
        unitPrice,
        taxId: line.taxId ?? null,
        taxRate,
        taxAmount,
        subtotal,
        totalAmount,
      });
    }

    return calculatedLines;
  }

  async create(dto: CreateSubscriptionDto) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: dto.customerId },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID "${dto.customerId}" not found`);
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan with ID "${dto.planId}" not found`);
    }

    const startDate = new Date(dto.startDate);
    const expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : null;

    if (!this.plansService.isAvailable(plan, startDate)) {
      throw new BadRequestException(
        `Plan "${plan.name}" is not available on starting date ${startDate.toISOString()}`,
      );
    }

    const calculatedLines = await this.calculateLineItems(
      dto.lines,
      plan.minQuantity,
    );

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateSequenceNumber(tx);

      return tx.subscription.create({
        data: {
          number,
          customerId: dto.customerId,
          planId: dto.planId,
          startDate,
          expiryDate,
          paymentTerms: dto.paymentTerms,
          status: SubscriptionStatus.DRAFT,
          lines: {
            create: calculatedLines,
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: { product: true, variant: true, tax: true },
          },
        },
      });
    });
  }

  /**
   * Instantiates a pre-filled draft subscription from a quotation template
   */
  async createFromTemplate(templateId: string, customerId: string, startDate?: string) {
    const start = startDate ? new Date(startDate) : new Date();
    const templateData = await this.quotationsService.instantiate(
      templateId,
      customerId,
      start,
    );

    const plan = await this.prisma.plan.findUnique({
      where: { id: templateData.planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan "${templateData.planId}" not found`);
    }

    const lineDtos: CreateSubscriptionLineDto[] = templateData.lines.map((l) => ({
      productId: l.productId,
      variantId: l.variantId ?? undefined,
      quantity: l.quantity,
    }));

    const calculatedLines = await this.calculateLineItems(lineDtos, plan.minQuantity);

    return this.prisma.$transaction(async (tx) => {
      const number = await this.generateSequenceNumber(tx);

      return tx.subscription.create({
        data: {
          number,
          customerId,
          planId: templateData.planId,
          startDate: start,
          expiryDate: templateData.quotationValidUntil,
          paymentTerms: 'Net 30',
          status: SubscriptionStatus.DRAFT,
          lines: {
            create: calculatedLines,
          },
        },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: { product: true, variant: true, tax: true },
          },
        },
      });
    });
  }

  async findAll(filters: SubscriptionFiltersDto) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Prisma.SubscriptionWhereInput = {};
    if (filters.status) where.status = filters.status;
    if (filters.customerId) where.customerId = filters.customerId;
    if (filters.planId) where.planId = filters.planId;

    if (filters.dateFrom || filters.dateTo) {
      where.startDate = {};
      if (filters.dateFrom) where.startDate.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startDate.lte = new Date(filters.dateTo);
    }

    const [items, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: { product: true, variant: true, tax: true },
          },
        },
      }),
      this.prisma.subscription.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: { product: true, variant: true, tax: true },
        },
        invoices: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription with ID "${id}" not found`);
    }
    return subscription;
  }

  /**
   * Edits subscription. Allowed ONLY while in DRAFT status.
   */
  async update(id: string, dto: UpdateSubscriptionDto) {
    const sub = await this.findOne(id);
    if (sub.status !== SubscriptionStatus.DRAFT) {
      throw new BadRequestException(
        `Subscriptions can only be modified while in DRAFT status. Current status is ${sub.status}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.subscriptionLine.deleteMany({
          where: { subscriptionId: id },
        });

        const calculatedLines = await this.calculateLineItems(
          dto.lines,
          sub.plan.minQuantity,
        );

        await tx.subscriptionLine.createMany({
          data: calculatedLines.map((l) => ({
            ...l,
            subscriptionId: id,
          })),
        });
      }

      return tx.subscription.update({
        where: { id },
        data: {
          ...(dto.startDate && { startDate: new Date(dto.startDate) }),
          ...(dto.expiryDate && { expiryDate: new Date(dto.expiryDate) }),
          ...(dto.paymentTerms && { paymentTerms: dto.paymentTerms }),
        },
        include: {
          customer: true,
          plan: true,
          lines: {
            include: { product: true, variant: true, tax: true },
          },
        },
      });
    });
  }

  /**
   * Helper to execute and enforce state machine transitions
   */
  private async transitionTo(
    id: string,
    targetStatus: SubscriptionStatus,
    additionalUpdates: Prisma.SubscriptionUpdateInput = {},
  ): Promise<Subscription> {
    const sub = await this.findOne(id);

    if (!canTransition(subscriptionTransitions, sub.status, targetStatus)) {
      throw new BadRequestException(
        `Illegal status transition: cannot move subscription "${sub.number}" from ${sub.status} to ${targetStatus}`,
      );
    }

    return this.prisma.subscription.update({
      where: { id },
      data: {
        status: targetStatus,
        ...additionalUpdates,
      },
      include: {
        customer: true,
        plan: true,
        lines: true,
      },
    });
  }

  /**
   * DRAFT -> QUOTATION
   */
  async quote(id: string) {
    return this.transitionTo(id, SubscriptionStatus.QUOTATION);
  }

  /**
   * QUOTATION -> CONFIRMED
   */
  async confirm(id: string) {
    return this.transitionTo(id, SubscriptionStatus.CONFIRMED);
  }

  /**
   * CONFIRMED -> ACTIVE
   * Sets nextBillingDate = startDate to initiate recurring billing
   */
  async activate(id: string) {
    const sub = await this.findOne(id);
    return this.transitionTo(id, SubscriptionStatus.ACTIVE, {
      nextBillingDate: sub.startDate,
    });
  }

  /**
   * ACTIVE -> CLOSED
   * Validates early closure rules if terminating prior to expiryDate
   */
  async close(id: string) {
    const sub = await this.findOne(id);
    const now = new Date();
    const isEarly = sub.expiryDate ? now < sub.expiryDate : false;

    if (isEarly) {
      this.plansService.verifyActionAllowed(sub.plan, 'earlyClose');
    }

    return this.transitionTo(id, SubscriptionStatus.CLOSED);
  }

  // ==========================================
  // P2 -> P3 / P4 Handoff Contracts
  // ==========================================

  /**
   * P3 Billing Engine Contract:
   * Finds active subscriptions whose billing is due on or before asOfDate.
   */
  async findDueForBilling(asOfDate: Date = new Date(), limit = 100) {
    return this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        nextBillingDate: { lte: asOfDate },
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: { product: true, variant: true, tax: true },
        },
      },
      take: limit,
      orderBy: { nextBillingDate: 'asc' },
    });
  }

  /**
   * P3 Billing Engine Contract:
   * Advances nextBillingDate according to the plan's recurrence period.
   */
  async advanceNextBillingDate(
    subscriptionId: string,
    tx?: PrismaService,
  ): Promise<Date> {
    const client = tx ?? this.prisma;
    const sub = await client.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });

    if (!sub) {
      throw new NotFoundException(`Subscription "${subscriptionId}" not found`);
    }

    const baseDate = sub.nextBillingDate ?? sub.startDate;
    const nextDate = new Date(baseDate);

    switch (sub.plan.billingPeriod) {
      case BillingPeriod.DAILY:
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case BillingPeriod.WEEKLY:
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case BillingPeriod.MONTHLY: {
        const anchorDay = sub.startDate.getDate();
        nextDate.setDate(1);
        nextDate.setMonth(nextDate.getMonth() + 1);
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(anchorDay, lastDay));
        break;
      }
      case BillingPeriod.YEARLY: {
        const anchorDay = sub.startDate.getDate();
        const anchorMonth = sub.startDate.getMonth();
        nextDate.setDate(1);
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        nextDate.setMonth(anchorMonth);
        const lastDay = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
        nextDate.setDate(Math.min(anchorDay, lastDay));
        break;
      }
    }

    await client.subscription.update({
      where: { id: subscriptionId },
      data: { nextBillingDate: nextDate },
    });

    return nextDate;
  }

  /**
   * Auto-closes active subscriptions that have passed their expiryDate
   * where the plan specifies autoClose: true.
   */
  async closeExpired(asOfDate: Date = new Date()): Promise<number> {
    const expiredSubs = await this.prisma.subscription.findMany({
      where: {
        status: SubscriptionStatus.ACTIVE,
        expiryDate: { lte: asOfDate },
        plan: { autoClose: true },
      },
      select: { id: true },
    });

    if (expiredSubs.length === 0) return 0;

    const ids = expiredSubs.map((s) => s.id);
    const result = await this.prisma.subscription.updateMany({
      where: { id: { in: ids } },
      data: { status: SubscriptionStatus.CLOSED },
    });

    return result.count;
  }
}
