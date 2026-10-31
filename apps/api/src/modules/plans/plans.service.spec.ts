import { BadRequestException } from '@nestjs/common';
import { BillingPeriod } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PlansService } from './plans.service';

describe('PlansService - Lifecycle Flags & Availability Contracts', () => {
  let service: PlansService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      plan: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new PlansService(mockPrisma);
  });

  describe('Lifecycle Flag Enforcement', () => {
    it('rejects pause when allowPause is false', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-fixed',
        name: 'Fixed Contract Plan',
        allowPause: false,
      });

      await expect(service.pause('plan-fixed')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('permits pause when allowPause is true', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-flex',
        name: 'Flexible Plan',
        allowPause: true,
      });

      const res = await service.pause('plan-flex');
      expect(res.success).toBe(true);
    });

    it('rejects early close when allowEarlyClose is false', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-yearly',
        name: 'Strict Yearly Commitment',
        allowEarlyClose: false,
      });

      await expect(service.close('plan-yearly', true)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects renewal when allowRenew is false', async () => {
      mockPrisma.plan.findUnique.mockResolvedValue({
        id: 'plan-legacy',
        name: 'Grandfathered Legacy Tier',
        allowRenew: false,
      });

      await expect(service.renew('plan-legacy')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('Availability & Interval Contracts', () => {
    it('correctly evaluates plan availability dates', () => {
      const plan = {
        startDate: new Date('2026-01-01T00:00:00Z'),
        endDate: new Date('2026-12-31T23:59:59Z'),
      };

      // Inside window
      expect(
        service.isAvailable(plan, new Date('2026-06-15T00:00:00Z')),
      ).toBe(true);

      // Before start
      expect(
        service.isAvailable(plan, new Date('2025-12-31T23:59:59Z')),
      ).toBe(false);

      // After end
      expect(
        service.isAvailable(plan, new Date('2027-01-01T00:00:00Z')),
      ).toBe(false);
    });

    it('correctly maps billing intervals for scheduling', () => {
      expect(
        service.getBillingInterval({ billingPeriod: BillingPeriod.DAILY }).days,
      ).toBe(1);
      expect(
        service.getBillingInterval({ billingPeriod: BillingPeriod.WEEKLY }).days,
      ).toBe(7);
      expect(
        service.getBillingInterval({ billingPeriod: BillingPeriod.MONTHLY })
          .months,
      ).toBe(1);
      expect(
        service.getBillingInterval({ billingPeriod: BillingPeriod.YEARLY })
          .months,
      ).toBe(12);
    });

    it('rejects creation when endDate is prior to or equal to startDate', async () => {
      await expect(
        service.create({
          name: 'Invalid Timeline Plan',
          price: '50.00',
          billingPeriod: BillingPeriod.MONTHLY,
          startDate: '2026-06-01T00:00:00Z',
          endDate: '2026-05-01T00:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
