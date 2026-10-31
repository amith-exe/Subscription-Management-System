import { DiscountType, Prisma } from '@prisma/client';
import { calculateDiscounts } from './discount-engine';

describe('calculateDiscounts', () => {
  it('rejects exhausted discounts', () => {
    const result = calculateDiscounts([{ productId: 'p1', quantity: 1, amount: new Prisma.Decimal(100) }], [{ id: 'd1', type: DiscountType.FIXED, value: new Prisma.Decimal(10), minPurchase: null, minQuantity: null, usageLimit: 1, usedCount: 1, active: true }]);
    expect(result).toHaveLength(0);
  });
});
