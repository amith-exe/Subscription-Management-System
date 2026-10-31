import { ApiProperty } from '@nestjs/swagger';
import { BillingPeriod, SubscriptionStatus, InvoiceStatus, TaxType } from '@prisma/client';

export class PortalSubscriptionLineDto {
  @ApiProperty({ example: 'line-uuid' })
  id!: string;

  @ApiProperty({ example: 'prod-uuid' })
  productId!: string;

  @ApiProperty({ example: 'Brightloop ERP Platform' })
  productName!: string;

  @ApiProperty({ example: 'var-uuid', nullable: true })
  variantId!: string | null;

  @ApiProperty({ example: 'Brand: Odoo (+₹560.00)', nullable: true })
  variantLabel!: string | null;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 1060.0 })
  unitPrice!: number;

  @ApiProperty({ example: 190.8 })
  taxAmount!: number;

  @ApiProperty({ example: 1060.0 })
  subtotal!: number;

  @ApiProperty({ example: 1250.8 })
  totalAmount!: number;
}

export class PortalSubscriptionResponseDto {
  @ApiProperty({ example: 'sub-uuid' })
  id!: string;

  @ApiProperty({ example: 'SUB-000001' })
  number!: string;

  @ApiProperty({ example: 'plan-uuid' })
  planId!: string;

  @ApiProperty({ example: 'Professional Monthly' })
  planName!: string;

  @ApiProperty({ enum: BillingPeriod, example: BillingPeriod.MONTHLY })
  billingPeriod!: BillingPeriod;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.ACTIVE })
  status!: SubscriptionStatus;

  @ApiProperty({ example: true })
  allowEarlyClose!: boolean;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  startDate!: Date;

  @ApiProperty({ example: '2026-11-01T00:00:00.000Z', nullable: true })
  nextBillingDate!: Date | null;

  @ApiProperty({ example: 'Net 30' })
  paymentTerms!: string;

  @ApiProperty({ type: [PortalSubscriptionLineDto] })
  lines!: PortalSubscriptionLineDto[];

  @ApiProperty({ example: 1250.8 })
  totalAmount!: number;
}

export class PortalInvoiceLineDto {
  @ApiProperty({ example: 'line-uuid' })
  id!: string;

  @ApiProperty({ example: 'Brightloop ERP Platform (Brand: Odoo)' })
  description!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 1060.0 })
  unitPrice!: number;

  @ApiProperty({ example: 1060.0 })
  subtotal!: number;

  @ApiProperty({ example: 190.8 })
  taxAmount!: number;

  @ApiProperty({ example: 0.0 })
  discountAmount!: number;

  @ApiProperty({ example: 1250.8 })
  totalAmount!: number;
}

export class PortalInvoiceResponseDto {
  @ApiProperty({ example: 'inv-uuid' })
  id!: string;

  @ApiProperty({ example: 'INV-000001' })
  number!: string;

  @ApiProperty({ example: 'sub-uuid' })
  subscriptionId!: string;

  @ApiProperty({ example: 'SUB-000001' })
  subscriptionNumber!: string;

  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.PAID })
  status!: InvoiceStatus;

  @ApiProperty({ example: false })
  isOverdue!: boolean;

  @ApiProperty({ example: '2026-09-01T00:00:00.000Z' })
  issueDate!: Date;

  @ApiProperty({ example: '2026-10-01T00:00:00.000Z' })
  dueDate!: Date;

  @ApiProperty({ example: 1060.0 })
  subtotal!: number;

  @ApiProperty({ example: 190.8 })
  taxTotal!: number;

  @ApiProperty({ example: 0.0 })
  discountTotal!: number;

  @ApiProperty({ example: 1250.8 })
  total!: number;

  @ApiProperty({ example: 1250.8 })
  amountPaid!: number;

  @ApiProperty({ type: [PortalInvoiceLineDto] })
  lines!: PortalInvoiceLineDto[];
}

export class CloseSubscriptionResponseDto {
  @ApiProperty({ example: 'sub-uuid' })
  id!: string;

  @ApiProperty({ example: 'SUB-000001' })
  number!: string;

  @ApiProperty({ enum: SubscriptionStatus, example: SubscriptionStatus.CLOSED })
  status!: SubscriptionStatus;

  @ApiProperty({ example: 'Subscription successfully closed' })
  message!: string;
}

