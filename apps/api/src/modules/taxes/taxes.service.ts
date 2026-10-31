import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TaxType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';

export type TaxCalculationResult = {
  taxId: string;
  taxName: string;
  taxRate: Decimal;
  taxType: TaxType;
  taxAmount: Decimal;
};

@Injectable()
export class TaxesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTaxDto) {
    const rateDecimal = new Decimal(dto.rate);
    const taxType = dto.type ?? TaxType.PERCENTAGE;

    if (taxType === TaxType.PERCENTAGE) {
      if (rateDecimal.lt(0) || rateDecimal.gt(100)) {
        throw new BadRequestException('Percentage tax rate must be between 0 and 100');
      }
    } else if (rateDecimal.lt(0)) {
      throw new BadRequestException('Fixed tax rate cannot be negative');
    }

    return this.prisma.tax.create({
      data: {
        name: dto.name,
        rate: rateDecimal,
        type: taxType,
      },
    });
  }

  async findAll() {
    return this.prisma.tax.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tax = await this.prisma.tax.findUnique({
      where: { id },
    });
    if (!tax) {
      throw new NotFoundException(`Tax rule with ID "${id}" not found`);
    }
    return tax;
  }

  async update(id: string, dto: UpdateTaxDto) {
    await this.findOne(id);

    const data: { name?: string; rate?: Decimal; type?: TaxType } = {};
    if (dto.name) data.name = dto.name;
    if (dto.type) data.type = dto.type;

    if (dto.rate !== undefined) {
      const rateDecimal = new Decimal(dto.rate);
      const targetType = dto.type ?? (await this.findOne(id)).type;
      if (targetType === TaxType.PERCENTAGE) {
        if (rateDecimal.lt(0) || rateDecimal.gt(100)) {
          throw new BadRequestException('Percentage tax rate must be between 0 and 100');
        }
      } else if (rateDecimal.lt(0)) {
        throw new BadRequestException('Fixed tax rate cannot be negative');
      }
      data.rate = rateDecimal;
    }

    return this.prisma.tax.update({
      where: { id },
      data,
    });
  }

  /**
   * P2 Handoff Contract:
   * TaxService.calculate(amount, taxId) with rounding rule fixed in one place.
   * Used by Subscriptions and Invoices.
   */
  async calculate(
    amount: Decimal,
    taxId: string,
    quantity = 1,
  ): Promise<TaxCalculationResult> {
    const tax = await this.prisma.tax.findUnique({
      where: { id: taxId },
    });

    if (!tax) {
      throw new NotFoundException(`Tax with ID "${taxId}" not found`);
    }

    let taxAmount: Decimal;
    if (tax.type === TaxType.PERCENTAGE) {
      // standard rounding to 4 decimal places
      taxAmount = amount.mul(tax.rate).div(100).toDecimalPlaces(4);
    } else {
      taxAmount = tax.rate.mul(quantity).toDecimalPlaces(4);
    }

    return {
      taxId: tax.id,
      taxName: tax.name,
      taxRate: tax.rate,
      taxType: tax.type,
      taxAmount,
    };
  }
}
