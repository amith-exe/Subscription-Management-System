import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class CreateVariantDto {
  @IsString()
  @IsNotEmpty()
  attribute: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsNumberString()
  @IsNotEmpty()
  extraPrice: string;
}
