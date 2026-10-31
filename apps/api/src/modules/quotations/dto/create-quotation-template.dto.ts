import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateTemplateLineDto } from './create-template-line.dto';

export class CreateQuotationTemplateDto {
  @ApiProperty({
    description: 'Name of the quotation template',
    example: 'Enterprise Onboarding Package',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Associated Plan UUID',
    example: 'plan-uuid-1234',
  })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({
    description: 'Number of days the quotation remains valid before expiration',
    example: 30,
    default: 30,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  validityDays: number;

  @ApiPropertyOptional({
    description: 'Pre-configured product and variant lines for this template',
    type: [CreateTemplateLineDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateLineDto)
  @IsOptional()
  lines?: CreateTemplateLineDto[];
}
