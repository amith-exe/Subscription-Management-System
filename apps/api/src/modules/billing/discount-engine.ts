import { DiscountScope, DiscountType, Prisma } from '@prisma/client';

export type DiscountCandidate = {
  id: string;
  type: DiscountType;
  value: Prisma.Decimal;
  minPurchase: Prisma.Decimal | null;
  minQuantity: number | null;
  usageLimit: number | null;
  usedCount: number;
  startDate?: Date;
  endDate?: Date | null;
  appliesTo?: DiscountScope;
  active?: boolean;
  products?: Array<{ productId: string }>;
  subscriptions?: Array<{ subscriptionId: string }>;
};

export type DraftInvoiceLine = { productId: string; quantity: number; amount: Prisma.Decimal };
export type DraftInvoice = {
  subscriptionId: string;
  lines: DraftInvoiceLine[];
  date?: Date;
};

export class DiscountEngine {
  static calculate(draftInvoice: DraftInvoice, candidates: DiscountCandidate[]) {
    const date = draftInvoice.date ?? new Date();
    const subtotal = draftInvoice.lines.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
    const quantity = draftInvoice.lines.reduce((sum, line) => sum + line.quantity, 0);

    return candidates.filter((discount) => {
      const inDateRange = (!discount.startDate || date >= discount.startDate) && (!discount.endDate || date <= discount.endDate);
      const withinUsage = discount.usageLimit === null || discount.usedCount < discount.usageLimit;
      const meetsMinimums = (discount.minPurchase === null || subtotal.gte(discount.minPurchase)) &&
        (discount.minQuantity === null || quantity >= discount.minQuantity);
      const inScope = !discount.appliesTo || (discount.appliesTo === DiscountScope.SUBSCRIPTION
        ? (discount.subscriptions ?? []).some((link) => link.subscriptionId === draftInvoice.subscriptionId)
        : draftInvoice.lines.some((line) => (discount.products ?? []).some((link) => link.productId === line.productId)));
      return discount.active !== false && inDateRange && withinUsage && meetsMinimums && inScope;
    }).map((discount) => {
      const eligibleSubtotal = discount.appliesTo === DiscountScope.PRODUCT
        ? draftInvoice.lines.filter((line) => (discount.products ?? []).some((link) => link.productId === line.productId))
          .reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0))
        : subtotal;
      return {
        discountId: discount.id,
        amount: discount.type === DiscountType.PERCENT
          ? eligibleSubtotal.mul(discount.value).div(100).toDecimalPlaces(4)
          : Prisma.Decimal.min(discount.value, eligibleSubtotal),
      };
    });
  }
}

export function calculateDiscounts(lines: DraftInvoiceLine[], candidates: DiscountCandidate[]) {
  return DiscountEngine.calculate({ subscriptionId: '', lines }, candidates);
}
