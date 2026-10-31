import { DiscountScope, DiscountType } from '@prisma/client';
import { IsArray, IsDateString, IsEnum, IsInt, IsNumberString, IsOptional, IsString, Min } from 'class-validator';

export class CreateDiscountDto {
  @IsEnum(DiscountType) type!: DiscountType;
  @IsNumberString() value!: string;
  @IsOptional() @IsNumberString() minPurchase?: string;
  @IsOptional() @IsInt() @Min(1) minQuantity?: number;
  @IsDateString() startDate!: string;
  @IsOptional() @IsDateString() endDate?: string;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number;
  @IsEnum(DiscountScope) appliesTo!: DiscountScope;
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) subscriptionIds?: string[];
}

export class UpdateDiscountDto {
  @IsOptional() @IsEnum(DiscountType) type?: DiscountType;
  @IsOptional() @IsNumberString() value?: string;
  @IsOptional() @IsNumberString() minPurchase?: string | null;
  @IsOptional() @IsInt() @Min(1) minQuantity?: number | null;
  @IsOptional() @IsDateString() startDate?: string;
  @IsOptional() @IsDateString() endDate?: string | null;
  @IsOptional() @IsInt() @Min(1) usageLimit?: number | null;
  @IsOptional() @IsEnum(DiscountScope) appliesTo?: DiscountScope;
  @IsOptional() @IsArray() @IsString({ each: true }) productIds?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) subscriptionIds?: string[];
}
