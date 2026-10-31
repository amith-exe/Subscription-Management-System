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
});
