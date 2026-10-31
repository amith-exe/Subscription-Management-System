import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateStaffDto {
  @ApiProperty({ description: 'Email address for the internal staff account', example: 'staff@example.com', required: true })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Display name used in the invitation email', example: 'Alex Staff', required: true, minLength: 1 })
  @IsString()
  @MinLength(1)
  name!: string;
}
