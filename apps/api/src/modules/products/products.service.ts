import { Injectable, NotFoundException } from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        name: dto.name,
        type: dto.type,
        salesPrice: new Decimal(dto.salesPrice),
        costPrice: new Decimal(dto.costPrice),
        notes: dto.notes,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async findAll(type?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = type ? { type, isActive: true } : { isActive: true };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: { variants: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total, page, limit };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { variants: true },
    });
    if (!product) {
      throw new NotFoundException(`Product with ID "${id}" not found`);
    }
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.type && { type: dto.type }),
        ...(dto.salesPrice && { salesPrice: new Decimal(dto.salesPrice) }),
        ...(dto.costPrice && { costPrice: new Decimal(dto.costPrice) }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async addVariant(productId: string, dto: CreateVariantDto) {
    await this.findOne(productId);
    return this.prisma.productVariant.create({
      data: {
        productId,
        attribute: dto.attribute,
        value: dto.value,
        extraPrice: new Decimal(dto.extraPrice),
      },
    });
  }

  async removeVariant(productId: string, variantId: string) {
    await this.findOne(productId);
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, productId },
    });
    if (!variant) {
      throw new NotFoundException(`Variant "${variantId}" not found on product "${productId}"`);
    }
    return this.prisma.productVariant.delete({
      where: { id: variantId },
    });
  }

  /**
   * P2 Handoff Contract:
   * Returns final unit price: product salesPrice + variant extraPrice
   * (e.g. Odoo brand adds +560 to base price)
   */
  async getPrice(productId: string, variantId?: string): Promise<Decimal> {
    const product = await this.findOne(productId);
    let finalPrice = new Decimal(product.salesPrice);

    if (variantId) {
      const variant = product.variants.find((v) => v.id === variantId);
      if (!variant) {
        throw new NotFoundException(`Variant "${variantId}" not found on product "${productId}"`);
      }
      finalPrice = finalPrice.plus(new Decimal(variant.extraPrice));
    }

    return finalPrice;
  }
}
