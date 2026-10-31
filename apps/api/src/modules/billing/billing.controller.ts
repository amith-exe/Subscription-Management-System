import { Controller, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { BillingService } from './billing.service';

@ApiTags('Billing')
@ApiBearerAuth('access-token')
@Controller('billing')
@UseGuards(RolesGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Post('run')
  @HttpCode(HttpStatus.ACCEPTED)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Queue a billing run for all active subscriptions due now' })
  @ApiResponse({ status: 202, description: 'A separate queue job was submitted for each due subscription.' })
  @ApiResponse({ status: 503, description: 'Billing queue is disabled or Redis is unavailable.' })
  run() { return this.billing.enqueueDueSubscriptions(); }
}
