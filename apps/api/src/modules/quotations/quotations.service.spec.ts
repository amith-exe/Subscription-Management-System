import { BadRequestException } from '@nestjs/common';
import { QuotationsService } from './quotations.service';

describe('QuotationsService - Template Instantiation Contract', () => {
  let service: QuotationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      plan: {
        findUnique: jest.fn(),
      },
      quotationTemplate: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      quotationTemplateLine: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockPrisma)),
    };
    service = new QuotationsService(mockPrisma);
  });

  it('instantiates draft subscription payload with correct validity window', async () => {
    const startDate = new Date('2026-06-01T00:00:00Z');
    mockPrisma.quotationTemplate.findUnique.mockResolvedValue({
      id: 'tpl-enterprise',
      name: 'Enterprise Package',
      planId: 'plan-annual',
      validityDays: 14,
      lines: [
        { productId: 'prod-crm', variantId: 'var-odoo', quantity: 10 },
      ],
    });

    const result = await service.instantiate(
      'tpl-enterprise',
      'cust-123',
      startDate,
    );

    expect(result.templateId).toBe('tpl-enterprise');
    expect(result.customerId).toBe('cust-123');
    expect(result.lines).toHaveLength(1);
    expect(result.lines[0].quantity).toBe(10);

    const expectedExpiry = new Date('2026-06-15T00:00:00Z');
    expect(result.quotationValidUntil.toISOString().slice(0, 10)).toBe(
      expectedExpiry.toISOString().slice(0, 10),
    );
  });

  it('rejects creation when plan does not exist', async () => {
    mockPrisma.plan.findUnique.mockResolvedValue(null);

    await expect(
      service.create({
        name: 'Invalid Template',
        planId: 'non-existent-plan',
        validityDays: 30,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
