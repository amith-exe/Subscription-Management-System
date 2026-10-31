import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DiscountScope, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateDiscountDto, UpdateDiscountDto } from './discounts.dto';

@Injectable()
export class DiscountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateDiscountDto) {
    this.validateScope(input.appliesTo, input.productIds, input.subscriptionIds);
    return this.prisma.discount.create({ data: {
      type: input.type,
      value: new Prisma.Decimal(input.value),
      minPurchase: input.minPurchase === undefined ? null : new Prisma.Decimal(input.minPurchase),
      minQuantity: input.minQuantity ?? null,
      startDate: new Date(input.startDate),
      endDate: input.endDate ? new Date(input.endDate) : null,
      usageLimit: input.usageLimit ?? null,
      appliesTo: input.appliesTo,
      products: { create: (input.productIds ?? []).map((productId) => ({ product: { connect: { id: productId } } })) },
      subscriptions: { create: (input.subscriptionIds ?? []).map((subscriptionId) => ({ subscription: { connect: { id: subscriptionId } } })) },
    }, include: { products: true, subscriptions: true } });
  }

  list() {
    return this.prisma.discount.findMany({ include: { products: true, subscriptions: true }, orderBy: { startDate: 'desc' } });
  }

  async update(id: string, input: UpdateDiscountDto) {
    const current = await this.prisma.discount.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Discount not found');
    const appliesTo = input.appliesTo ?? current.appliesTo;
    if (input.appliesTo || input.productIds || input.subscriptionIds) {
      this.validateScope(appliesTo, input.productIds, input.subscriptionIds);
    }
    const data: Prisma.DiscountUpdateInput = {
      ...(input.type !== undefined && { type: input.type }),
      ...(input.value !== undefined && { value: new Prisma.Decimal(input.value) }),
      ...(input.minPurchase !== undefined && { minPurchase: input.minPurchase === null ? null : new Prisma.Decimal(input.minPurchase) }),
      ...(input.minQuantity !== undefined && { minQuantity: input.minQuantity }),
      ...(input.startDate !== undefined && { startDate: new Date(input.startDate) }),
      ...(input.endDate !== undefined && { endDate: input.endDate === null ? null : new Date(input.endDate) }),
      ...(input.usageLimit !== undefined && { usageLimit: input.usageLimit }),
      ...(input.appliesTo !== undefined && { appliesTo: input.appliesTo }),
    };
    if (input.productIds) data.products = { deleteMany: {}, create: input.productIds.map((productId) => ({ product: { connect: { id: productId } } })) };
    if (input.subscriptionIds) data.subscriptions = { deleteMany: {}, create: input.subscriptionIds.map((subscriptionId) => ({ subscription: { connect: { id: subscriptionId } } })) };
    return this.prisma.discount.update({ where: { id }, data, include: { products: true, subscriptions: true } });
  }

  async deactivate(id: string) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new NotFoundException('Discount not found');
    return this.prisma.discount.update({ where: { id }, data: { endDate: new Date() } });
  }

  async getApplicable(subscriptionId: string, date: Date) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id: subscriptionId }, select: { lines: { select: { productId: true } } } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    const productIds = [...new Set(subscription.lines.map((line) => line.productId))];
    return this.prisma.discount.findMany({
      where: { startDate: { lte: date }, AND: [{ OR: [{ endDate: null }, { endDate: { gte: date } }] }, { OR: [
        { appliesTo: DiscountScope.SUBSCRIPTION, subscriptions: { some: { subscriptionId } } },
        { appliesTo: DiscountScope.PRODUCT, products: { some: { productId: { in: productIds } } } },
      ] }] },
      include: { products: true, subscriptions: true },
    });
  }

  async reserveUsage(id: string): Promise<boolean> {
    const changed = await this.prisma.$executeRaw`UPDATE "Discount" SET "usedCount" = "usedCount" + 1 WHERE "id" = ${id} AND ("usageLimit" IS NULL OR "usedCount" < "usageLimit")`;
    return changed === 1;
  }

  private validateScope(scope: DiscountScope, productIds?: string[], subscriptionIds?: string[]) {
    if (scope === DiscountScope.PRODUCT && !productIds?.length) throw new BadRequestException('Product discounts require productIds');
    if (scope === DiscountScope.SUBSCRIPTION && !subscriptionIds?.length) throw new BadRequestException('Subscription discounts require subscriptionIds');
  }
}
