import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class CreateVariantDto {
  @ApiProperty({
    description: 'Variant attribute dimension',
    example: 'Brand',
  })
  @IsString()
  @IsNotEmpty()
  attribute: string;

  @ApiProperty({
    description: 'Variant attribute value',
    example: 'Odoo',
  })
  @IsString()
  @IsNotEmpty()
  value: string;

  @ApiProperty({
    description: 'Extra price added to base product sales price (Decimal string)',
    example: '560.00',
  })
  @IsNumberString()
  @IsNotEmpty()
  extraPrice: string;
}
