import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Role } from '@prisma/client';
import { CreateStaffDto } from './users.dto';
import { UsersService } from './users.service';
import { UserResponse } from '../auth/auth.dto';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { Roles } from '../../common/auth/roles.decorator';
import { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('users')
@Controller('users')
export class UsersController {
  public constructor(private readonly users: UsersService) {}

  @Post('staff')
  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create an internal staff account; ADMIN only' })
  @ApiResponse({ status: 201, type: UserResponse })
  @ApiResponse({ status: 403, description: 'ADMIN role required' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  public async createStaff(@Body() dto: CreateStaffDto, @CurrentUser() admin: AuthenticatedUser, @Req() req: Request): Promise<UserResponse> {
    return this.users.createStaff(dto, admin.id, req.ip);
  }
}
