import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BillingPeriod, Plan } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

export type PlanBillingInterval = {
  period: BillingPeriod;
  days: number;
  months: number;
};

@Injectable()
export class PlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('Plan endDate must be chronologically after startDate');
    }

    return this.prisma.plan.create({
      data: {
        name: dto.name,
        price: new Decimal(dto.price),
        billingPeriod: dto.billingPeriod,
        minQuantity: dto.minQuantity ?? 1,
        startDate,
        endDate,
        autoClose: dto.autoClose ?? true,
        allowEarlyClose: dto.allowEarlyClose ?? false,
        allowPause: dto.allowPause ?? false,
        allowRenew: dto.allowRenew ?? true,
      },
    });
  }

  async findAll(availableOnly = false) {
    const now = new Date();
    const where = availableOnly
      ? {
          startDate: { lte: now },
          OR: [{ endDate: null }, { endDate: { gte: now } }],
        }
      : {};

    return this.prisma.plan.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { subscriptions: true, templates: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.plan.findUnique({
      where: { id },
      include: {
        _count: {
          select: { subscriptions: true, templates: true },
        },
      },
    });
    if (!plan) {
      throw new NotFoundException(`Billing plan with ID "${id}" not found`);
    }
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    const existing = await this.findOne(id);

    const startDate = dto.startDate ? new Date(dto.startDate) : existing.startDate;
    const endDate =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : existing.endDate;

    if (endDate && endDate <= startDate) {
      throw new BadRequestException('Plan endDate must be chronologically after startDate');
    }

    return this.prisma.plan.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.price && { price: new Decimal(dto.price) }),
        ...(dto.billingPeriod && { billingPeriod: dto.billingPeriod }),
        ...(dto.minQuantity !== undefined && { minQuantity: dto.minQuantity }),
        ...(dto.startDate && { startDate }),
        ...(dto.endDate !== undefined && { endDate }),
        ...(dto.autoClose !== undefined && { autoClose: dto.autoClose }),
        ...(dto.allowEarlyClose !== undefined && { allowEarlyClose: dto.allowEarlyClose }),
        ...(dto.allowPause !== undefined && { allowPause: dto.allowPause }),
        ...(dto.allowRenew !== undefined && { allowRenew: dto.allowRenew }),
      },
    });
  }

  /**
   * Enforces admin lifecycle flag: allowPause
   */
  async pause(id: string) {
    const plan = await this.findOne(id);
    if (!plan.allowPause) {
      throw new BadRequestException(`Plan "${plan.name}" does not permit pausing`);
    }
    return {
      success: true,
      message: `Plan "${plan.name}" pause action verified and permitted`,
      planId: plan.id,
    };
  }

  /**
   * Enforces admin lifecycle flag: allowEarlyClose
   */
  async close(id: string, isEarly = false) {
    const plan = await this.findOne(id);
    if (isEarly && !plan.allowEarlyClose) {
      throw new BadRequestException(
        `Plan "${plan.name}" does not permit early closure prior to its defined end date`,
      );
    }
    return {
      success: true,
      message: `Plan "${plan.name}" closure verified and permitted`,
      planId: plan.id,
    };
  }

  /**
   * Enforces admin lifecycle flag: allowRenew
   */
  async renew(id: string) {
    const plan = await this.findOne(id);
    if (!plan.allowRenew) {
      throw new BadRequestException(`Plan "${plan.name}" does not permit renewal`);
    }
    return {
      success: true,
      message: `Plan "${plan.name}" renewal verified and permitted`,
      planId: plan.id,
    };
  }

  /**
   * P2 Handoff Contract:
   * Checks whether a plan is currently within its active availability window.
   */
  isAvailable(plan: Pick<Plan, 'startDate' | 'endDate'>, asOfDate: Date = new Date()): boolean {
    const afterStart = asOfDate >= plan.startDate;
    const beforeEnd = !plan.endDate || asOfDate <= plan.endDate;
    return afterStart && beforeEnd;
  }

  /**
   * P2 Handoff Contract:
   * Maps plan billing cadence to concrete interval metrics for advancing billing dates.
   */
  getBillingInterval(plan: Pick<Plan, 'billingPeriod'>): PlanBillingInterval {
    switch (plan.billingPeriod) {
      case BillingPeriod.DAILY:
        return { period: BillingPeriod.DAILY, days: 1, months: 0 };
      case BillingPeriod.WEEKLY:
        return { period: BillingPeriod.WEEKLY, days: 7, months: 0 };
      case BillingPeriod.MONTHLY:
        return { period: BillingPeriod.MONTHLY, days: 30, months: 1 };
      case BillingPeriod.YEARLY:
        return { period: BillingPeriod.YEARLY, days: 365, months: 12 };
      default:
        throw new BadRequestException(`Unsupported billing period: ${plan.billingPeriod}`);
    }
  }

  /**
   * Validates whether a specific lifecycle transition is permitted by the plan.
   * Consumed by SubscriptionsService before executing status changes.
   */
  verifyActionAllowed(
    plan: Plan,
    action: 'pause' | 'earlyClose' | 'renew',
  ): void {
    if (action === 'pause' && !plan.allowPause) {
      throw new BadRequestException(`Plan "${plan.name}" does not permit pausing`);
    }
    if (action === 'earlyClose' && !plan.allowEarlyClose) {
      throw new BadRequestException(`Plan "${plan.name}" does not permit early closure`);
    }
    if (action === 'renew' && !plan.allowRenew) {
      throw new BadRequestException(`Plan "${plan.name}" does not permit renewal`);
    }
  }
}
