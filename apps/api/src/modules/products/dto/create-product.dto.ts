import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumberString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Name of the product',
    example: 'Business Software Suite',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description: 'Product type classification',
    example: 'software',
    enum: ['software', 'addon', 'service'],
  })
  @IsString()
  @IsNotEmpty()
  type!: string;

  @ApiProperty({
    description: 'Base sales price (Decimal string)',
    example: '1000.00',
  })
  @IsNumberString()
  @IsNotEmpty()
  salesPrice!: string;

  @ApiProperty({
    description: 'Cost price for margin reporting (Decimal string)',
    example: '400.00',
  })
  @IsNumberString()
  @IsNotEmpty()
  costPrice!: string;

  @ApiPropertyOptional({
    description: 'Internal notes and product specifications',
    example: 'Core subscription package for enterprise and SMB customers',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
