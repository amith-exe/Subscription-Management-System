import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateDiscountDto, UpdateDiscountDto } from './discounts.dto';
import { DiscountsService } from './discounts.service';

@Controller('discounts')
@UseGuards(RolesGuard)
@ApiTags('Discounts')
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a discount' })
  @ApiResponse({ status: 201, description: 'Discount created with its product or subscription scope.' })
  create(@Body() input: CreateDiscountDto) { return this.discounts.create(input); }

  @Get()
  @ApiOperation({ summary: 'List discounts' })
  @ApiResponse({ status: 200, description: 'Discounts with their scopes.' })
  list() { return this.discounts.list(); }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a discount' })
  @ApiParam({ name: 'id', type: String, description: 'Discount UUID.' })
  @ApiResponse({ status: 200, description: 'Discount updated.' })
  @ApiResponse({ status: 404, description: 'Discount not found.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateDiscountDto) { return this.discounts.update(id, input); }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Deactivate a discount' })
  @ApiParam({ name: 'id', type: String, description: 'Discount UUID.' })
  @ApiResponse({ status: 200, description: 'Discount end date set to now.' })
  @ApiResponse({ status: 404, description: 'Discount not found.' })
  deactivate(@Param('id', ParseUUIDPipe) id: string) { return this.discounts.deactivate(id); }
}

