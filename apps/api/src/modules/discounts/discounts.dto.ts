import { DiscountScope, DiscountType } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class CreateDiscountDto {
  @ApiPropertyOptional({ example: 'Summer Launch Discount' })
  @IsOptional() @IsString() name?: string;
  @ApiProperty({ enum: DiscountType, example: DiscountType.PERCENT })
  @IsEnum(DiscountType) type!: DiscountType;
  @ApiProperty({ example: '15', description: 'Fixed currency amount or percentage, based on type.' })
  @IsNumberString() value!: string;
  @ApiPropertyOptional({ example: '100' })
  @IsOptional() @IsNumberString() minPurchase?: string;
  @ApiPropertyOptional({ example: 2, minimum: 1 })
  @IsOptional() @IsInt() @Min(1) minQuantity?: number;
  @ApiProperty({ type: String, format: 'date-time' })
  @IsDateString() startDate!: string;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @IsDateString() endDate?: string;
  @ApiPropertyOptional({ minimum: 1, description: 'Maximum number of times the discount can be used.' })
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @ApiProperty({ enum: DiscountScope })
  @IsEnum(DiscountScope) appliesTo!: DiscountScope;
  @ApiPropertyOptional({ type: [String], description: 'Required for PRODUCT scope.' })
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
  @ApiPropertyOptional({ type: [String], description: 'Required for SUBSCRIPTION scope.' })
  @IsOptional() @IsArray() @IsString({ each: true }) subscriptionIds?: string[];
}

export class UpdateDiscountDto {
  @ApiPropertyOptional({ example: 'Updated Discount Name' })
  @IsOptional() @IsString() name?: string;
  @ApiPropertyOptional({ enum: DiscountType })
  @IsOptional() @IsEnum(DiscountType) type?: DiscountType;
  @ApiPropertyOptional({ example: '15' })
  @IsOptional() @IsNumberString() value?: string;
  @ApiPropertyOptional({ example: '100', nullable: true })
  @IsOptional() @IsNumberString() minPurchase?: string | null;
  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional() @IsInt() @Min(1) minQuantity?: number | null;
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional() @IsDateString() startDate?: string;
  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  @IsOptional() @IsDateString() endDate?: string | null;
  @ApiPropertyOptional({ minimum: 1, nullable: true })
  @IsOptional() @IsInt() @Min(1) usageLimit?: number | null;
  @ApiPropertyOptional({ enum: DiscountScope })
  @IsOptional() @IsEnum(DiscountScope) appliesTo?: DiscountScope;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray() @IsString({ each: true }) subscriptionIds?: string[];
}
