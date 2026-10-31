import { Decimal } from '@prisma/client/runtime/library';
import { DiscountType } from '@prisma/client';

export type DiscountCandidate = {
  id: string;
  type: DiscountType;
  value: Decimal;
  minPurchase: Decimal | null;
  minQuantity: number | null;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
};

export type DraftInvoiceLine = { productId: string; quantity: number; amount: Decimal };

export function calculateDiscounts(lines: DraftInvoiceLine[], candidates: DiscountCandidate[]) {
  const subtotal = lines.reduce((sum, line) => sum.plus(line.amount), new Decimal(0));
  const quantity = lines.reduce((sum, line) => sum + line.quantity, 0);
  return candidates.filter((discount) => discount.active &&
    (!discount.minPurchase || subtotal.gte(discount.minPurchase)) &&
    (!discount.minQuantity || quantity >= discount.minQuantity) &&
    (!discount.usageLimit || discount.usedCount < discount.usageLimit)
  ).map((discount) => ({
    discountId: discount.id,
    amount: discount.type === DiscountType.PERCENT
      ? subtotal.mul(discount.value).div(100).toDecimalPlaces(4)
      : Decimal.min(discount.value, subtotal),
  }));
}
