import { Decimal } from '@prisma/client/runtime/library';
import { ProductsService } from './products.service';

describe('ProductsService - Pricing Contract', () => {
  let service: ProductsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findUnique: jest.fn(),
      },
      productVariant: {
        findFirst: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ProductsService(mockPrisma);
  });

  it('calculates final price with Odoo variant (+560 extra)', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Business Software',
      salesPrice: new Decimal('1000.00'),
      variants: [
        {
          id: 'var-odoo',
          productId: 'prod-1',
          attribute: 'Brand',
          value: 'Odoo',
          extraPrice: new Decimal('560.00'),
        },
      ],
    });

    const price = await service.getPrice('prod-1', 'var-odoo');
    expect(price.toString()).toBe('1560');
  });

  it('returns base price if no variant is selected', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      name: 'Business Software',
      salesPrice: new Decimal('1000.00'),
      variants: [],
    });

    const price = await service.getPrice('prod-1');
    expect(price.toString()).toBe('1000');
  });

  it('throws NotFoundException when removing a variant that does not belong to the product', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', variants: [] });
    mockPrisma.productVariant.findFirst.mockResolvedValue(null);

    await expect(service.removeVariant('prod-1', 'non-existent')).rejects.toThrow('not found');
  });

  it('deletes variant when it belongs to the product', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 'prod-1', variants: [] });
    mockPrisma.productVariant.findFirst.mockResolvedValue({ id: 'var-1', productId: 'prod-1' });
    mockPrisma.productVariant.delete.mockResolvedValue({ id: 'var-1' });

    const result = await service.removeVariant('prod-1', 'var-1');
    expect(mockPrisma.productVariant.delete).toHaveBeenCalledWith({ where: { id: 'var-1' } });
    expect(result).toEqual({ id: 'var-1' });
  });
});
