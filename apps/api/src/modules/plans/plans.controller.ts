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
  ApiQuery,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';

@ApiTags('plans')
@ApiBearerAuth()
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new subscription plan (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Plan created successfully with admin lifecycle flags',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid plan payload (e.g. endDate prior to startDate)',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  create(@Body() dto: CreatePlanDto) {
    return this.plansService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiQuery({
    name: 'availableOnly',
    required: false,
    type: Boolean,
    description: 'Filter only plans within active availability dates',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of subscription plans with usage counts',
  })
  findAll(@Query('availableOnly') availableOnly?: string) {
    return this.plansService.findAll(availableOnly === 'true');
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get plan details by ID' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Plan details' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Plan not found',
  })
  findOne(@Param('id') id: string) {
    return this.plansService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update plan configuration and flags (Admin only)' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Plan updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid plan update payload',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto) {
    return this.plansService.update(id, dto);
  }

  @Post(':id/pause')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Verify and trigger plan pause (strictly obeys allowPause flag)' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pause permitted by plan configuration',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan configuration prohibits pausing',
  })
  pause(@Param('id') id: string) {
    return this.plansService.pause(id);
  }

  @Post(':id/close')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Verify and trigger plan closure (strictly obeys allowEarlyClose flag)' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiQuery({
    name: 'isEarly',
    required: false,
    type: Boolean,
    description: 'Indicates if closure occurs before endDate',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Closure permitted by plan configuration',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan configuration prohibits early closure',
  })
  close(@Param('id') id: string, @Query('isEarly') isEarly?: string) {
    return this.plansService.close(id, isEarly === 'true');
  }

  @Post(':id/renew')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Verify and trigger plan renewal (strictly obeys allowRenew flag)' })
  @ApiParam({ name: 'id', description: 'Plan UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Renewal permitted by plan configuration',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Plan configuration prohibits renewal',
  })
  renew(@Param('id') id: string) {
    return this.plansService.renew(id);
  }
}
