import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaxType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateTaxDto {
  @ApiProperty({
    description: 'Name of the tax rule (e.g. VAT, Sales Tax)',
    example: 'Standard VAT',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Tax rate (0 to 100 for percentage, or fixed monetary amount)',
    example: '18.00',
  })
  @IsNumberString()
  @IsNotEmpty()
  rate!: string;

  @ApiPropertyOptional({
    description: 'Type of tax calculation (PERCENTAGE or FIXED)',
    enum: TaxType,
    default: TaxType.PERCENTAGE,
  })
  @IsEnum(TaxType)
  @IsOptional()
  type?: TaxType;
}
