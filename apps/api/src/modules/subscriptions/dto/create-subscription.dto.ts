import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateSubscriptionLineDto } from './create-subscription-line.dto';

export class CreateSubscriptionDto {
  @ApiProperty({
    description: 'Customer UUID',
    example: 'cust-uuid-1234',
  })
  @IsString()
  @IsNotEmpty()
  customerId: string;

  @ApiProperty({
    description: 'Associated Plan UUID',
    example: 'plan-uuid-5678',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'Subscription start date (ISO 8601)',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Subscription expiry date (ISO 8601)',
    example: '2027-05-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiProperty({
    description: 'Payment terms (e.g. Immediate, Net 15, Net 30)',
    example: 'Net 30',
    default: 'Net 30',
  })
  @IsString()
  @IsNotEmpty()
  paymentTerms: string;

  @ApiProperty({
    description: 'Subscription product and variant line items',
    type: [CreateSubscriptionLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubscriptionLineDto)
  lines: CreateSubscriptionLineDto[];
}
