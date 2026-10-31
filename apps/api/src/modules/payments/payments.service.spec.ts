import { BadRequestException, NotFoundException } from '@nestjs/common';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  const invoiceId = '1cae6a98-1523-4e0c-a534-5b3f692700d1';
  let service: PaymentsService;
  let prisma: any;
  let tx: any;
  let invoice: any;

  beforeEach(() => {
    invoice = {
      id: invoiceId,
      number: 17,
      status: InvoiceStatus.CONFIRMED,
      total: new Prisma.Decimal('100.00'),
      amountPaid: new Prisma.Decimal('25.00'),
    };
    tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      invoice: {
        findUnique: jest.fn().mockImplementation(async () => ({ ...invoice })),
        update: jest.fn().mockImplementation(async ({ data }: any) => {
          invoice = { ...invoice, ...data };
          return { ...invoice };
        }),
      },
      payment: { create: jest.fn().mockImplementation(async ({ data }: any) => ({ id: 'payment-1', ...data })) },
    };
    prisma = {
      $transaction: jest.fn().mockImplementation((work: any) => Array.isArray(work) ? Promise.all(work) : work(tx)),
      invoice: { findUnique: jest.fn() },
      payment: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
    service = new PaymentsService(prisma, { get: jest.fn() } as any);
  });

  const paymentInput = (amount: number) => ({
    invoiceId,
    method: PaymentMethod.CARD,
    amount,
    date: '2026-10-31T12:00:00.000Z',
    note: 'Manual settlement',
  });

  it('records a partial payment and keeps the invoice outstanding', async () => {
    const result = await service.create(paymentInput(20));

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.payment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ invoiceId, method: PaymentMethod.CARD, amount: new Prisma.Decimal('20'), paidAt: new Date(paymentInput(20).date) }),
    }));
    expect(result.invoice.amountPaid.toString()).toBe('45');
    expect(result.invoice.status).toBe(InvoiceStatus.CONFIRMED);
  });

  it('marks an invoice paid exactly when cumulative payments reach its total', async () => {
    const result = await service.create(paymentInput(75));

    expect(result.invoice.amountPaid.toString()).toBe('100');
    expect(result.invoice.status).toBe(InvoiceStatus.PAID);
  });

  it.each([InvoiceStatus.DRAFT, InvoiceStatus.CANCELLED])('rejects payments on %s invoices', async (status) => {
    invoice.status = status;

    await expect(service.create(paymentInput(10))).rejects.toThrow(BadRequestException);
    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });

  it('rejects overpayment without changing the payment ledger or invoice', async () => {
    await expect(service.create(paymentInput(75.01))).rejects.toThrow('exceeds the outstanding invoice balance');

    expect(tx.payment.create).not.toHaveBeenCalled();
    expect(tx.invoice.update).not.toHaveBeenCalled();
  });

  it('rejects a payment for a missing invoice', async () => {
    tx.invoice.findUnique.mockResolvedValue(null);

    await expect(service.create(paymentInput(10))).rejects.toThrow(NotFoundException);
  });

  it('returns filtered payments with bounded pagination metadata', async () => {
    const rows = [{ id: 'payment-1', invoice: { ...invoice } }];
    prisma.payment.findMany.mockResolvedValue(rows);
    prisma.payment.count.mockResolvedValue(31);

    const result = await service.list({
      invoiceId,
      method: PaymentMethod.CARD,
      page: 2,
      pageSize: 10,
      dateFrom: new Date('2026-10-01T00:00:00.000Z'),
    });

    expect(prisma.payment.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ invoiceId, method: PaymentMethod.CARD, paidAt: { gte: new Date('2026-10-01T00:00:00.000Z') } }),
      skip: 10,
      take: 10,
    }));
    expect(result.total).toBe(31);
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.data[0].invoice.outstandingAmount.toString()).toBe('75');
  });

  it('returns an empty paginated list for a valid invoice with no payments', async () => {
    prisma.invoice.findUnique.mockResolvedValue({ id: invoiceId });
    prisma.payment.findMany.mockResolvedValue([]);
    prisma.payment.count.mockResolvedValue(0);

    await expect(service.forInvoice(invoiceId, { page: 1, pageSize: 20 })).resolves.toEqual({
      data: [], total: 0, page: 1, pageSize: 20,
    });
  });

  it('returns not found for invoice payment history on a missing invoice', async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);

    await expect(service.forInvoice(invoiceId, { page: 1, pageSize: 20 })).rejects.toThrow(NotFoundException);
  });
});
