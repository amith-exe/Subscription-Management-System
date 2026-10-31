import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateTemplateLineDto {
  @ApiProperty({
    description: 'Product UUID to include in the template',
    example: 'prod-uuid-1234',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional Product Variant UUID (e.g. Brand = Odoo)',
    example: 'var-uuid-5678',
  })
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiPropertyOptional({
    description: 'Default quantity for this line item',
    default: 1,
    example: 5,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}
