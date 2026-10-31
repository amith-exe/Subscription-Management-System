import { BadRequestException } from '@nestjs/common';
import { Prisma, TaxType } from '@prisma/client';
import { TaxesService } from './taxes.service';

describe('TaxesService - Calculation & Validation Contract', () => {
  let service: TaxesService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tax: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new TaxesService(mockPrisma);
  });

  it('calculates percentage tax correctly (18% on $1000 = $180)', async () => {
    mockPrisma.tax.findUnique.mockResolvedValue({
      id: 'tax-vat',
      name: 'Standard VAT',
      rate: new Prisma.Decimal('18.00'),
      type: TaxType.PERCENTAGE,
    });

    const result = await service.calculate(new Prisma.Decimal('1000.00'), 'tax-vat');
    expect(result.taxAmount.toString()).toBe('180');
    expect(result.taxRate.toString()).toBe('18');
  });

  it('calculates fixed tax correctly ($5 per unit on 3 units = $15)', async () => {
    mockPrisma.tax.findUnique.mockResolvedValue({
      id: 'tax-fixed',
      name: 'Fixed Eco Fee',
      rate: new Prisma.Decimal('5.00'),
      type: TaxType.FIXED,
    });

    const result = await service.calculate(new Prisma.Decimal('250.00'), 'tax-fixed', 3);
    expect(result.taxAmount.toString()).toBe('15');
  });

  it('rejects percentage rates greater than 100', async () => {
    await expect(
      service.create({
        name: 'Invalid Tax',
        rate: '105.00',
        type: TaxType.PERCENTAGE,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects negative tax rates', async () => {
    await expect(
      service.create({
        name: 'Negative Tax',
        rate: '-5.00',
        type: TaxType.PERCENTAGE,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
