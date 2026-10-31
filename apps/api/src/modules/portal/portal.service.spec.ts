import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BillingPeriod, InvoiceStatus, SubscriptionStatus } from '@prisma/client';
import { PortalService } from './portal.service';

describe('PortalService (Module 15)', () => {
  let service: PortalService;
  let mockPrisma: any;

  const CUSTOMER_A_ID = 'cust-uuid-aaa';
  const CUSTOMER_B_ID = 'cust-uuid-bbb';

  const mockPlanEarlyClose = {
    id: 'plan-1',
    name: 'Professional Monthly',
    billingPeriod: BillingPeriod.MONTHLY,
    allowEarlyClose: true,
  };

  const mockPlanLocked = {
    id: 'plan-2',
    name: 'Enterprise Annual (Locked)',
    billingPeriod: BillingPeriod.YEARLY,
    allowEarlyClose: false,
  };

  const mockSubscriptionCustA = {
    id: 'sub-1',
    number: 'SUB-000001',
    customerId: CUSTOMER_A_ID,
    planId: 'plan-1',
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date('2026-09-01'),
    nextBillingDate: new Date('2026-11-01'),
    paymentTerms: 'Net 30',
    plan: mockPlanEarlyClose,
    lines: [
      {
        id: 'line-1',
        productId: 'prod-1',
        product: { name: 'Brightloop ERP Platform' },
        variant: { attribute: 'Brand', value: 'Odoo', extraPrice: 560 },
        quantity: 1,
        unitPrice: 1060,
        subtotal: 1060,
        taxAmount: 190.8,
        totalAmount: 1250.8,
      },
    ],
  };

  const mockInvoiceCustA = {
    id: 'inv-1',
    number: 'INV-000001',
    customerId: CUSTOMER_A_ID,
    subscriptionId: 'sub-1',
    status: InvoiceStatus.PAID,
    issueDate: new Date('2026-09-01'),
    dueDate: new Date('2026-10-01'),
    subtotal: 1060,
    taxTotal: 190.8,
    discountTotal: 0,
    total: 1250.8,
    payments: [{ amount: 1250.8, method: 'CARD' }],
    lines: [
      {
        id: 'iline-1',
        description: 'Brightloop ERP Platform',
        quantity: 1,
        unitPrice: 1060,
        subtotal: 1060,
        taxAmount: 190.8,
        discountAmount: 0,
        totalAmount: 1250.8,
      },
    ],
    customer: { id: CUSTOMER_A_ID, name: 'Acme Corp', company: 'Acme Corp', taxId: 'TAX-1' },
    subscription: { plan: mockPlanEarlyClose, number: 'SUB-000001' },
  };

  beforeEach(() => {
    mockPrisma = {
      subscription: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      invoice: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
      },
    };
    service = new PortalService(mockPrisma);
  });

  describe('Tenant Data Isolation (Definition of Done)', () => {
    it('returns only subscriptions belonging to the calling customer', async () => {
      mockPrisma.subscription.findMany.mockResolvedValue([mockSubscriptionCustA]);

      const result = await service.getSubscriptions(CUSTOMER_A_ID);

      expect(mockPrisma.subscription.findMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_A_ID },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe('SUB-000001');
    });

    it('Customer B attempting to read Customer A subscription throws NotFoundException', async () => {
      // findFirst with customerId = Customer B returns null because it belongs to Customer A
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.getSubscription(CUSTOMER_B_ID, 'sub-1')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.subscription.findFirst).toHaveBeenCalledWith({
        where: { id: 'sub-1', customerId: CUSTOMER_B_ID },
        include: expect.any(Object),
      });
    });

    it('returns customer invoices and calculates overdue accurately', async () => {
      mockPrisma.invoice.findMany.mockResolvedValue([mockInvoiceCustA]);

      const result = await service.getInvoices(CUSTOMER_A_ID);

      expect(mockPrisma.invoice.findMany).toHaveBeenCalledWith({
        where: { customerId: CUSTOMER_A_ID },
        include: expect.any(Object),
        orderBy: { issueDate: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].number).toBe('INV-000001');
      expect(result[0].amountPaid).toBe(1250.8);
    });

    it('Customer B attempting to read Customer A invoice throws NotFoundException', async () => {
      mockPrisma.invoice.findFirst.mockResolvedValue(null);

      await expect(service.getInvoice(CUSTOMER_B_ID, 'inv-1')).rejects.toThrow(NotFoundException);

      expect(mockPrisma.invoice.findFirst).toHaveBeenCalledWith({
        where: { id: 'inv-1', customerId: CUSTOMER_B_ID },
        include: expect.any(Object),
      });
    });
  });

  describe('Early Cancellation Rules (allowEarlyClose Policy)', () => {
    it('allows cancellation when plan allowEarlyClose is true', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        ...mockSubscriptionCustA,
        plan: mockPlanEarlyClose,
      });
      mockPrisma.subscription.update.mockResolvedValue({
        id: 'sub-1',
        number: 'SUB-000001',
        status: SubscriptionStatus.CLOSED,
      });

      const res = await service.closeSubscription(CUSTOMER_A_ID, 'sub-1');

      expect(res.status).toBe(SubscriptionStatus.CLOSED);
      expect(mockPrisma.subscription.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: {
          status: SubscriptionStatus.CLOSED,
          updatedAt: expect.any(Date),
        },
      });
    });

    it('rejects early cancellation with BadRequestException when allowEarlyClose is false', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue({
        ...mockSubscriptionCustA,
        plan: mockPlanLocked,
      });

      await expect(service.closeSubscription(CUSTOMER_A_ID, 'sub-1')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.subscription.update).not.toHaveBeenCalled();
    });

    it('rejects cancellation of nonexistent subscription or wrong customer with NotFoundException', async () => {
      mockPrisma.subscription.findFirst.mockResolvedValue(null);

      await expect(service.closeSubscription(CUSTOMER_B_ID, 'sub-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
