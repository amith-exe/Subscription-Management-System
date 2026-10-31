import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('analytics')
@ApiBearerAuth('access-token')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.INTERNAL)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  summary() { return this.analytics.summary(); }

  @Get('mrr-movement')
  mrrMovement() { return this.analytics.mrrMovement(); }

  @Get('aging')
  aging() { return this.analytics.aging(); }

  @Get('top-plans')
  topPlans() { return this.analytics.topPlans(); }
}