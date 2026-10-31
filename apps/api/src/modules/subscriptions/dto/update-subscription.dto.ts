import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateSubscriptionLineDto } from './create-subscription-line.dto';

export class UpdateSubscriptionDto {
  @ApiPropertyOptional({
    description: 'Updated subscription start date',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Updated subscription expiry date',
    example: '2027-05-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsOptional()
  expiryDate?: string;

  @ApiPropertyOptional({
    description: 'Updated payment terms',
    example: 'Net 15',
  })
  @IsString()
  @IsOptional()
  paymentTerms?: string;

  @ApiPropertyOptional({
    description: 'Updated subscription product lines (replaces existing lines)',
    type: [CreateSubscriptionLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSubscriptionLineDto)
  @IsOptional()
  lines?: CreateSubscriptionLineDto[];
}
