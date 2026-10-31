import { IsNotEmpty, IsOptional, IsString, IsNumberString, IsBoolean } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsNumberString()
  @IsNotEmpty()
  salesPrice: string;

  @IsNumberString()
  @IsNotEmpty()
  costPrice: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
