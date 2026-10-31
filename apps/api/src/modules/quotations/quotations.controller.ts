import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { QuotationsService } from './quotations.service';
import { CreateQuotationTemplateDto } from './dto/create-quotation-template.dto';
import { UpdateQuotationTemplateDto } from './dto/update-quotation-template.dto';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';

@ApiTags('quotation-templates')
@ApiBearerAuth()
@Controller('quotation-templates')
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @Post()
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Create a new quotation template blueprint (Admin only)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Quotation template created with pre-filled product lines',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid template payload or referenced plan does not exist',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  create(@Body() dto: CreateQuotationTemplateDto) {
    return this.quotationsService.create(dto);
  }

  @Get()
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'List all available quotation templates' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of quotation templates with bundled lines and plan details',
  })
  findAll() {
    return this.quotationsService.findAll();
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Get quotation template details and lines by ID' })
  @ApiParam({ name: 'id', description: 'Quotation template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation template details',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quotation template not found',
  })
  findOne(@Param('id') id: string) {
    return this.quotationsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Update quotation template configuration and lines (Admin only)' })
  @ApiParam({ name: 'id', description: 'Quotation template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation template updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Quotation template not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateQuotationTemplateDto,
  ) {
    return this.quotationsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Delete a quotation template (Admin only)' })
  @ApiParam({ name: 'id', description: 'Quotation template UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quotation template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Forbidden - requires ADMIN role',
  })
  delete(@Param('id') id: string) {
    return this.quotationsService.delete(id);
  }
}
