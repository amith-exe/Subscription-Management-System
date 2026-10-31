import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { SubscriptionFiltersDto } from './dto/subscription-filters.dto';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new subscription in DRAFT status' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Subscription created successfully with atomic SUB- number',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation failed or minimum quantity violated',
  })
  create(@Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(dto);
  }

  @Post('from-template/:templateId')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Instant 1-click creation of a draft subscription from a quotation template',
  })
  @ApiParam({ name: 'templateId', description: 'Quotation Template UUID' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Draft subscription initialized from template bundle',
  })
  createFromTemplate(
    @Param('templateId') templateId: string,
    @Body('customerId') customerId: string,
    @Body('startDate') startDate?: string,
  ) {
    return this.subscriptionsService.createFromTemplate(
      templateId,
      customerId,
      startDate,
    );
  }

  @Get()
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List subscriptions with filters and pagination' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of subscriptions',
  })
  findAll(@Query() filters: SubscriptionFiltersDto) {
    return this.subscriptionsService.findAll(filters);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get subscription details and lines by ID' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription details with lines, plan, customer, and invoices',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Subscription not found',
  })
  findOne(@Param('id') id: string) {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update subscription details (Strictly permitted in DRAFT status only)',
  })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Draft subscription updated',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Cannot modify subscription past DRAFT status',
  })
  update(@Param('id') id: string, @Body() dto: UpdateSubscriptionDto) {
    return this.subscriptionsService.update(id, dto);
  }

  @Post(':id/quote')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Transition subscription: DRAFT -> QUOTATION' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription transitioned to QUOTATION',
  })
  quote(@Param('id') id: string) {
    return this.subscriptionsService.quote(id);
  }

  @Post(':id/confirm')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Transition subscription: QUOTATION -> CONFIRMED' })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription transitioned to CONFIRMED',
  })
  confirm(@Param('id') id: string) {
    return this.subscriptionsService.confirm(id);
  }

  @Post(':id/activate')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Transition subscription: CONFIRMED -> ACTIVE (Initiates recurring billing schedule)',
  })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription transitioned to ACTIVE and nextBillingDate initialized',
  })
  activate(@Param('id') id: string) {
    return this.subscriptionsService.activate(id);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Transition subscription: ACTIVE -> CLOSED (Enforces plan early close policy)',
  })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Subscription terminated and closed',
  })
  close(@Param('id') id: string) {
    return this.subscriptionsService.close(id);
  }
}
