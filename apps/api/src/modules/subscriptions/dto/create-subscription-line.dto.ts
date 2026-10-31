import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateSubscriptionLineDto {
  @ApiProperty({
    description: 'Product UUID',
    example: 'prod-uuid-1234',
  })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiPropertyOptional({
    description: 'Product Variant UUID (e.g. Brand = Odoo adds +560)',
    example: 'var-uuid-5678',
  })
  @IsString()
  @IsOptional()
  variantId?: string;

  @ApiProperty({
    description: 'Subscription quantity / seats',
    example: 5,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  quantity: number;

  @ApiPropertyOptional({
    description: 'Tax rule UUID to apply to this line item',
    example: 'tax-uuid-9012',
  })
  @IsString()
  @IsOptional()
  taxId?: string;
}
