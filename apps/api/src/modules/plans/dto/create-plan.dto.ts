import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillingPeriod } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({
    description: 'Name of the billing plan',
    example: 'Enterprise Annual Tier',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Base price for the plan interval (Decimal string)',
    example: '1200.00',
  })
  @IsNumberString()
  @IsNotEmpty()
  price: string;

  @ApiProperty({
    description: 'Billing recurrence cadence',
    enum: BillingPeriod,
    example: BillingPeriod.MONTHLY,
  })
  @IsEnum(BillingPeriod)
  @IsNotEmpty()
  billingPeriod: BillingPeriod;

  @ApiPropertyOptional({
    description: 'Minimum purchase quantity required for this plan',
    default: 1,
    example: 1,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  minQuantity?: number;

  @ApiProperty({
    description: 'Effective start date of plan availability (ISO 8601 string)',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiPropertyOptional({
    description: 'Expiration date of plan availability (ISO 8601 string)',
    example: '2026-12-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    description: 'Whether the plan automatically closes upon passing endDate',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  autoClose?: boolean;

  @ApiPropertyOptional({
    description: 'Whether subscriptions on this plan are allowed to close before endDate',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowEarlyClose?: boolean;

  @ApiPropertyOptional({
    description: 'Whether subscriptions on this plan are allowed to pause',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  allowPause?: boolean;

  @ApiPropertyOptional({
    description: 'Whether subscriptions on this plan are allowed to renew',
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  allowRenew?: boolean;
}
