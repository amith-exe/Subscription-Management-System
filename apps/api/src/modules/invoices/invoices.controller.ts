import { Controller, ForbiddenException, Get, Param, ParseUUIDPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiProduces, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InvoiceStatus, Role } from '@prisma/client';
import type { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { Roles } from '../../common/auth/roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';

@Controller('invoices')
@ApiTags('Invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @ApiOperation({ summary: 'List invoices', description: 'Returns a page of invoices. When overdue=true, returns CONFIRMED invoices with a past due date.' })
  @ApiQuery({ name: 'status', required: false, enum: InvoiceStatus })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  @ApiQuery({ name: 'overdue', required: false, type: Boolean, example: false })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20, maximum: 100 })
  @ApiResponse({ status: 200, description: 'Paginated invoice results.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: Record<string, string | undefined>) {
    if (user.role === Role.CUSTOMER && !user.customerId) throw new ForbiddenException('Customer account is not linked to a customer record');
    return this.invoices.list({
      status: query.status as InvoiceStatus | undefined,
      customerId: user.role === Role.CUSTOMER ? user.customerId! : query.customerId,
      overdue: query.overdue === 'true',
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ? Number(query.page) : 1,
      pageSize: query.pageSize ? Number(query.pageSize) : 20,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an invoice by ID' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID.' })
  @ApiResponse({ status: 200, description: 'Invoice details, lines, and payments.' })
  @ApiResponse({ status: 404, description: 'Invoice not found.' })
  get(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === Role.CUSTOMER && !user.customerId) throw new ForbiddenException('Customer account is not linked to a customer record');
    return this.invoices.get(id, user.role === Role.CUSTOMER ? user.customerId! : undefined);
  }

  @Post(':id/confirm')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Confirm a draft invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID.' })
  @ApiResponse({ status: 200, description: 'Invoice confirmed.' })
  @ApiResponse({ status: 400, description: 'Invoice cannot transition to confirmed.' })
  confirm(@Param('id', ParseUUIDPipe) id: string) { return this.invoices.confirm(id); }

  @Post(':id/cancel')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Cancel an invoice' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID.' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled.' })
  @ApiResponse({ status: 400, description: 'Invoice cannot transition to cancelled.' })
  cancel(@Param('id', ParseUUIDPipe) id: string) { return this.invoices.cancel(id); }

  @Post(':id/send')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Email a confirmed invoice PDF to its customer' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID.' })
  @ApiResponse({ status: 201, description: 'Invoice email sent.' })
  @ApiResponse({ status: 503, description: 'SMTP email delivery is not configured.' })
  async send(@Param('id', ParseUUIDPipe) id: string) {
    await this.invoices.send(id);
    return { sent: true };
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download an invoice PDF' })
  @ApiParam({ name: 'id', type: String, description: 'Invoice UUID.' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'Invoice PDF document.', schema: { type: 'string', format: 'binary' } })
  async pdf(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Res() response: Response) {
    if (user.role === Role.CUSTOMER && !user.customerId) throw new ForbiddenException('Customer account is not linked to a customer record');
    const { number, pdf } = await this.invoices.pdf(id, user.role === Role.CUSTOMER ? user.customerId! : undefined);
    response.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `inline; filename="${number}.pdf"` });
    response.send(pdf);
  }
}
