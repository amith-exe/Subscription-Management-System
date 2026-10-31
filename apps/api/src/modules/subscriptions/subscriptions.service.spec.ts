import { BadRequestException } from '@nestjs/common';
import { BillingPeriod, SubscriptionStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { SubscriptionsService } from './subscriptions.service';

describe('SubscriptionsService - State Machine & Business Rules', () => {
  let service: SubscriptionsService;
  let mockPrisma: any;
  let mockProducts: any;
  let mockTaxes: any;
  let mockPlans: any;
  let mockQuotations: any;

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      customer: {
        findUnique: jest.fn(),
      },
      plan: {
        findUnique: jest.fn(),
      },
      sequence: {
        upsert: jest.fn().mockResolvedValue({
          name: 'SUBSCRIPTION',
          currentValue: 123,
          prefix: 'SUB-',
          padding: 6,
        }),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };

    mockProducts = {
      getPrice: jest.fn().mockResolvedValue(new Decimal('100.00')),
    };

    mockTaxes = {
      calculate: jest.fn().mockResolvedValue({
        taxRate: new Decimal('18.00'),
        taxAmount: new Decimal('18.00'),
      }),
    };

    mockPlans = {
      isAvailable: jest.fn().mockReturnValue(true),
      getBillingInterval: jest.fn().mockReturnValue({ period: 'MONTHLY', days: 30, months: 1 }),
      verifyActionAllowed: jest.fn(),
    };

    mockQuotations = {
      instantiate: jest.fn(),
    };

    service = new SubscriptionsService(
      mockPrisma,
      mockProducts,
      mockTaxes,
      mockPlans,
      mockQuotations,
    );
  });

  describe('State Machine Transitions', () => {
    it('rejects illegal status transition (DRAFT directly to ACTIVE)', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        number: 'SUB-000001',
        status: SubscriptionStatus.DRAFT,
      });

      await expect(service.activate('sub-1')).rejects.toThrow(BadRequestException);
    });

    it('permits legal transition: DRAFT to QUOTATION', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        number: 'SUB-000001',
        status: SubscriptionStatus.DRAFT,
      });
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        status: SubscriptionStatus.QUOTATION,
      });

      const res = await service.quote('sub-1');
      expect(res.status).toBe(SubscriptionStatus.QUOTATION);
    });

    it('initializes nextBillingDate to startDate on activate (CONFIRMED -> ACTIVE)', async () => {
      const startDate = new Date('2026-06-01T00:00:00Z');
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        number: 'SUB-000001',
        status: SubscriptionStatus.CONFIRMED,
        startDate,
      });
      mockPrisma.subscription.update.mockImplementation(({ data }: { data: { status: SubscriptionStatus; nextBillingDate?: Date | null } }) => ({
        id: 'sub-1',
        status: data.status,
        nextBillingDate: data.nextBillingDate,
      }));

      const res = await service.activate('sub-1');
      expect(res.status).toBe(SubscriptionStatus.ACTIVE);
      expect(res.nextBillingDate).toEqual(startDate);
    });
  });

  describe('Immutability and Modification Rules', () => {
    it('rejects PATCH update when subscription is not in DRAFT status', async () => {
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        number: 'SUB-000001',
        status: SubscriptionStatus.ACTIVE,
      });

      await expect(
        service.update('sub-1', { paymentTerms: 'Net 15' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Sequential Number Generation', () => {
    it('formats sequential numbers with SUB- prefix and padding', async () => {
      const number = await service.generateSequenceNumber(mockPrisma);
      expect(number).toBe('SUB-000123');
    });
  });

  describe('Billing Contract: advanceNextBillingDate', () => {
    it('advances monthly nextBillingDate by exactly 1 month', async () => {
      const initialDate = new Date('2026-06-01T00:00:00Z');
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        nextBillingDate: initialDate,
        startDate: initialDate,
        plan: {
          billingPeriod: BillingPeriod.MONTHLY,
        },
      });

      const nextDate = await service.advanceNextBillingDate('sub-1');
      expect(nextDate.getMonth()).toBe((initialDate.getMonth() + 1) % 12);
    });

    it('clamps to the last day of month on month-end subscriptions (e.g. Jan 31 -> Feb 28)', async () => {
      const startDate = new Date('2026-01-31T00:00:00Z');
      mockPrisma.subscription.findUnique.mockResolvedValue({
        id: 'sub-1',
        nextBillingDate: startDate,
        startDate: startDate,
        plan: {
          billingPeriod: BillingPeriod.MONTHLY,
        },
      });

      const nextDate = await service.advanceNextBillingDate('sub-1');
      expect(nextDate.getMonth()).toBe(1); // February
      expect(nextDate.getDate()).toBe(28); // 2026 is not a leap year, 28 days
    });
  });
});
