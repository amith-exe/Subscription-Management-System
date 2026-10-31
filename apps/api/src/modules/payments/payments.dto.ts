import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyRazorpayPaymentDto {
  @ApiProperty() @IsString() @MinLength(5) razorpay_order_id!: string;
  @ApiProperty() @IsString() @MinLength(5) razorpay_payment_id!: string;
  @ApiProperty() @IsString() @MinLength(32) razorpay_signature!: string;
}
