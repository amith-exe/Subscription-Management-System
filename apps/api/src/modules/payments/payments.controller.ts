import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiBody, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PaymentMethod, Role } from '@prisma/client';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, ListPaymentsQueryDto, PaginatedPaymentsResponseDto, PaymentResponseDto, VerifyRazorpayPaymentDto } from './payments.dto';

@ApiTags('payments')
@Controller()
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('payments')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Record an offline or manually reconciled invoice payment' })
  @ApiBody({ type: CreatePaymentDto })
  @ApiCreatedResponse({ type: PaymentResponseDto, description: 'Payment recorded and invoice balance updated.' })
  @ApiBadRequestResponse({ description: 'Invoice is draft, cancelled, settled, or the payment exceeds its balance.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  create(@Body() body: CreatePaymentDto) {
    return this.payments.create(body);
  }

  @Get('payments')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List payments with optional filters and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, minimum: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20, minimum: 1, maximum: 100 })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'invoiceId', required: false, type: String, format: 'uuid' })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, format: 'date-time' })
  @ApiOkResponse({ type: PaginatedPaymentsResponseDto, description: 'Paginated payment records and their invoices.' })
  list(@Query() query: ListPaymentsQueryDto) {
    return this.payments.list({
      ...query,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
    });
  }

  @Get('invoices/:id/payments')
  @Roles(Role.ADMIN, Role.INTERNAL)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List payments recorded against an invoice' })
  @ApiParam({ name: 'id', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1, minimum: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20, minimum: 1, maximum: 100 })
  @ApiQuery({ name: 'method', required: false, enum: PaymentMethod })
  @ApiQuery({ name: 'dateFrom', required: false, type: String, format: 'date-time' })
  @ApiQuery({ name: 'dateTo', required: false, type: String, format: 'date-time' })
  @ApiOkResponse({ type: PaginatedPaymentsResponseDto, description: 'Paginated payments for the invoice.' })
  @ApiNotFoundResponse({ description: 'Invoice not found.' })
  forInvoice(@Param('id', ParseUUIDPipe) id: string, @Query() query: ListPaymentsQueryDto) {
    return this.payments.forInvoice(id, query);
  }

  @Post('payments/invoices/:invoiceId/order')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create or resume the Razorpay order for an invoice balance' })
  createOrder(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.payments.createOrder(user, invoiceId);
  }

  @Post('payments/verify')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify and record a captured Razorpay checkout payment' })
  verify(@CurrentUser() user: AuthenticatedUser, @Body() body: VerifyRazorpayPaymentDto) {
    return this.payments.verifyCheckoutPayment(user, body);
  }

}
