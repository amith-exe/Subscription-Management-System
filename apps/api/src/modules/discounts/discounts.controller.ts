import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import { CreateDiscountDto, UpdateDiscountDto } from './discounts.dto';
import { DiscountsService } from './discounts.service';

@Controller('discounts')
@UseGuards(RolesGuard)
export class DiscountsController {
  constructor(private readonly discounts: DiscountsService) {}

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() input: CreateDiscountDto) { return this.discounts.create(input); }

  @Get()
  list() { return this.discounts.list(); }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() input: UpdateDiscountDto) { return this.discounts.update(id, input); }

  @Post(':id/deactivate')
  @Roles(Role.ADMIN)
  deactivate(@Param('id', ParseUUIDPipe) id: string) { return this.discounts.deactivate(id); }
}

