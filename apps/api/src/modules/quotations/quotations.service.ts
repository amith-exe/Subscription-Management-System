import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuotationTemplateDto } from './dto/create-quotation-template.dto';
import { UpdateQuotationTemplateDto } from './dto/update-quotation-template.dto';

@Injectable()
export class QuotationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateQuotationTemplateDto) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: dto.planId },
    });
    if (!plan) {
      throw new BadRequestException(`Plan with ID "${dto.planId}" does not exist`);
    }

    return this.prisma.quotationTemplate.create({
      data: {
        name: dto.name,
        planId: dto.planId,
        validityDays: dto.validityDays,
        lines: {
          create: (dto.lines ?? []).map((line) => ({
            productId: line.productId,
            variantId: line.variantId ?? null,
            quantity: line.quantity ?? 1,
          })),
        },
      },
      include: {
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.quotationTemplate.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const template = await this.prisma.quotationTemplate.findUnique({
      where: { id },
      include: {
        plan: true,
        lines: {
          include: { product: true, variant: true },
        },
      },
    });
    if (!template) {
      throw new NotFoundException(`Quotation template with ID "${id}" not found`);
    }
    return template;
  }

  async update(id: string, dto: UpdateQuotationTemplateDto) {
    await this.findOne(id);

    if (dto.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: dto.planId },
      });
      if (!plan) {
        throw new BadRequestException(`Plan with ID "${dto.planId}" does not exist`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.lines) {
        await tx.quotationTemplateLine.deleteMany({
          where: { templateId: id },
        });
        await tx.quotationTemplateLine.createMany({
          data: dto.lines.map((line) => ({
            templateId: id,
            productId: line.productId,
            variantId: line.variantId ?? null,
            quantity: line.quantity ?? 1,
          })),
        });
      }

      return tx.quotationTemplate.update({
        where: { id },
        data: {
          ...(dto.name && { name: dto.name }),
          ...(dto.planId && { planId: dto.planId }),
          ...(dto.validityDays !== undefined && { validityDays: dto.validityDays }),
        },
        include: {
          plan: true,
          lines: {
            include: { product: true, variant: true },
          },
        },
      });
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.quotationTemplate.delete({
      where: { id },
    });
  }

  /**
   * P2 Handoff Contract:
   * Instantiates template lines and validity period for subscription creation.
   * Consumed by SubscriptionsService.createFromTemplate().
   */
  async instantiate(templateId: string, customerId: string, startDate = new Date()) {
    const template = await this.findOne(templateId);

    const validUntil = new Date(startDate);
    validUntil.setDate(validUntil.getDate() + template.validityDays);

    return {
      templateId: template.id,
      templateName: template.name,
      planId: template.planId,
      customerId,
      startDate,
      quotationValidUntil: validUntil,
      lines: template.lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        quantity: line.quantity,
      })),
    };
  }
}
