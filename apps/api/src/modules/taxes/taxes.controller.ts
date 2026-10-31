import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
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
import { TaxesService } from './taxes.service';
import { CreateTaxDto } from './dto/create-tax.dto';
import { UpdateTaxDto } from './dto/update-tax.dto';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';

@ApiTags('taxes')
@ApiBearerAuth()
@Controller('taxes')
export class TaxesController {
  constructor(private readonly taxesService: TaxesService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new tax rule (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Tax rule created successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid tax rate (e.g. rate not between 0 and 100 for percentage)',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  create(@Body() dto: CreateTaxDto) {
    return this.taxesService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all tax rules (Admin and Internal staff)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of configured tax rules',
  })
  findAll() {
    return this.taxesService.findAll();
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update a tax rule (Admin only)' })
  @ApiParam({ name: 'id', description: 'Tax rule UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tax rule updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Tax rule not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  update(@Param('id') id: string, @Body() dto: UpdateTaxDto) {
    return this.taxesService.update(id, dto);
  }
}
