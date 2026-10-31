import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus, PaymentMethod } from '@prisma/client';
import { IsDateString, IsEnum, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiProperty({ example: 125.5, minimum: 0.01, description: 'Payment amount in the invoice currency.' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: '2026-10-31T12:00:00.000Z', format: 'date-time' })
  @IsDateString()
  date!: string;

  @ApiPropertyOptional({ example: 'Razorpay payment pay_123', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  invoiceId!: string;
}

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  pageSize = 20;

  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional() @IsEnum(PaymentMethod)
  method?: PaymentMethod;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional() @IsUUID()
  invoiceId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional() @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional() @IsDateString()
  dateTo?: string;
}

export class VerifyRazorpayPaymentDto {
  @ApiProperty() @IsString() @MinLength(5) razorpay_order_id!: string;
  @ApiProperty() @IsString() @MinLength(5) razorpay_payment_id!: string;
  @ApiProperty() @IsString() @MinLength(32) razorpay_signature!: string;
}

export class PaymentResponseDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) invoiceId!: string;
  @ApiProperty({ enum: PaymentMethod }) method!: PaymentMethod;
  @ApiProperty({ type: Number, example: 125.5 }) amount!: number;
  @ApiProperty({ format: 'date-time' }) paidAt!: string;
  @ApiPropertyOptional({ nullable: true }) note?: string | null;
  @ApiPropertyOptional({ nullable: true }) reference?: string | null;
  @ApiPropertyOptional({ type: () => PaymentInvoiceBalanceDto }) invoice?: PaymentInvoiceBalanceDto;
}

export class PaymentInvoiceBalanceDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'INV-000017' }) number!: string;
  @ApiProperty({ enum: InvoiceStatus }) status!: InvoiceStatus;
  @ApiProperty({ type: Number }) total!: number;
  @ApiProperty({ type: Number }) amountPaid!: number;
  @ApiProperty({ type: Number }) outstandingAmount!: number;
}

export class PaginatedPaymentsResponseDto {
  @ApiProperty({ type: [PaymentResponseDto] }) data!: PaymentResponseDto[];
  @ApiProperty({ example: 42 }) total!: number;
  @ApiProperty({ example: 1 }) page!: number;
  @ApiProperty({ example: 20 }) pageSize!: number;
}
