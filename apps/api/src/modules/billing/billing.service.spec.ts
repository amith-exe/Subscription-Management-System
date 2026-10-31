import { BillingPeriod, InvoiceStatus, Prisma, SubscriptionStatus, TaxType } from '@prisma/client';
import { BillingService, nextPeriodDate } from './billing.service';

describe('BillingService', () => {
  const prisma = { subscription: { findMany: jest.fn() }, invoice: { findMany: jest.fn() }, $executeRaw: jest.fn(), $transaction: jest.fn() };
  const service = new BillingService(prisma as never, { sendOverdueReminder: jest.fn() } as never);
  beforeEach(() => jest.clearAllMocks());

  it('preserves the original calendar billing date after February is clamped', () => {
    const anchor = new Date('2026-01-31T00:00:00Z');
    const february = nextPeriodDate(anchor, BillingPeriod.MONTHLY, anchor);
    expect(february.toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(nextPeriodDate(february, BillingPeriod.MONTHLY, anchor).toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('queues 500 subscriptions as separate jobs in one bulk operation', async () => {
    const dueDate = new Date('2026-10-31T00:00:00Z');
    prisma.subscription.findMany.mockResolvedValue(Array.from({ length: 500 }, (_, i) => ({ id: `sub-${i}`, nextBillingDate: dueDate })));
    const addBulk = jest.fn().mockResolvedValue([]);
    (service as unknown as { queue?: { addBulk: typeof addBulk } }).queue = { addBulk };

    await expect(service.enqueueDueSubscriptions(dueDate)).resolves.toEqual({ queued: 500 });
    expect(addBulk).toHaveBeenCalledTimes(1);
    const jobs = addBulk.mock.calls[0][0] as Array<{ data: { subscriptionId: string }; opts: { jobId: string } }>;
    expect(jobs).toHaveLength(500);
    expect(new Set(jobs.map((job) => job.opts.jobId)).size).toBe(500);
  });

  it('creates a confirmed, taxed invoice and does not duplicate it on a repeated job', async () => {
    const subscription = {
      id: 'sub-1', number: 'SUB-1', customerId: 'customer-1', status: SubscriptionStatus.ACTIVE,
      startDate: new Date('2026-10-01T00:00:00Z'), nextBillingDate: new Date('2026-10-01T00:00:00Z'),
      expiryDate: null, paymentTerms: 'Net 14', plan: { billingPeriod: BillingPeriod.MONTHLY, autoClose: true },
      lines: [{ productId: 'p1', quantity: 1, unitPrice: new Prisma.Decimal(100), subtotal: new Prisma.Decimal(100), taxRate: new Prisma.Decimal(18), tax: { type: TaxType.PERCENTAGE, rate: new Prisma.Decimal(18) }, product: { name: 'Plan service' }, variant: null }],
    };
    const tx: any = {
      $queryRaw: jest.fn(), $executeRaw: jest.fn(),
      subscription: {
        findUnique: jest.fn().mockImplementation(async () => subscription),
        update: jest.fn().mockImplementation(async ({ data }) => { Object.assign(subscription, data); return subscription; }),
      },
      invoice: { findUnique: jest.fn().mockResolvedValue(null), create: jest.fn().mockResolvedValue({ id: 'inv-1' }) },
      discount: { findMany: jest.fn().mockResolvedValue([]) },
      discountUsage: { create: jest.fn() },
    };
    prisma.$transaction.mockImplementation((callback: (client: typeof tx) => Promise<unknown>) => callback(tx));
    const now = new Date('2027-01-31T00:00:00Z');

    const first = await service.billDuePeriods('sub-1', now);
    const repeated = await service.billDuePeriods('sub-1', now);

    expect(first.billed).toBe(4);
    expect(repeated.billed).toBe(0);
    expect(tx.invoice.create).toHaveBeenCalledTimes(4);
    const data = tx.invoice.create.mock.calls[0][0].data;
    expect(data.status).toBe(InvoiceStatus.CONFIRMED);
    expect(data.total.toString()).toBe('118');
    expect(data.periodEnd.toISOString()).toBe('2026-11-01T00:00:00.000Z');
  });
});
