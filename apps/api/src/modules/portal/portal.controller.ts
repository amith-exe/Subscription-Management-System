import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../../common/auth/roles.guard';
import { Roles } from '../../common/auth/roles.decorator';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { PortalService } from './portal.service';
import {
  CloseSubscriptionResponseDto,
  PortalInvoiceResponseDto,
  PortalSubscriptionResponseDto,
} from './dto/portal.dto';

@ApiTags('portal')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER, Role.ADMIN)
@Controller('portal')
export class PortalController {
  constructor(private readonly portalService: PortalService) {}

  /**
   * Helper to resolve customer ID securely.
   * If user is CUSTOMER: strictly forces customerId from authenticated session.
   * If user is ADMIN: can optionally impersonate via ?customerId= query param.
   */
  private resolveCustomerId(user: AuthenticatedUser, queryCustomerId?: string): string {
    if (user.role === Role.CUSTOMER) {
      if (!user.customerId) {
        throw new ForbiddenException('Authenticated user does not have a linked customer profile');
      }
      return user.customerId;
    }

    // Role is ADMIN
    if (queryCustomerId && queryCustomerId.trim() !== '') {
      return queryCustomerId.trim();
    }

    if (user.customerId) {
      return user.customerId;
    }

    throw new BadRequestException(
      'Admin request requires a target customerId query parameter (e.g. ?customerId=<uuid>)',
    );
  }

  @Get('subscriptions')
  @ApiOperation({
    summary: 'List customer subscriptions',
    description:
      'Fetches all active and past subscriptions belonging to the authenticated customer. Strictly isolates tenant data.',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Target customer ID (Allowed for ADMIN only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Array of customer subscriptions with line items and plan rules',
    type: [PortalSubscriptionResponseDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized JWT access token' })
  @ApiResponse({ status: 403, description: 'Forbidden (Not a Customer or Admin)' })
  async getSubscriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalSubscriptionResponseDto[]> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getSubscriptions(customerId);
  }

  @Get('subscriptions/:id')
  @ApiOperation({
    summary: 'Get subscription details',
    description:
      'Fetches single subscription details by ID. Enforces tenant boundary: returns 404 if subscription belongs to another tenant.',
  })
  @ApiParam({ name: 'id', description: 'Subscription UUID' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Target customer ID (Allowed for ADMIN only)',
  })
  @ApiResponse({ status: 200, type: PortalSubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found or belongs to another tenant' })
  async getSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalSubscriptionResponseDto> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getSubscription(customerId, id);
  }

  @Get('invoices')
  @ApiOperation({
    summary: 'List customer invoices',
    description: 'Lists all historical and overdue invoices for the authenticated tenant.',
  })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Target customer ID (Allowed for ADMIN only)',
  })
  @ApiResponse({ status: 200, type: [PortalInvoiceResponseDto] })
  async getInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalInvoiceResponseDto[]> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getInvoices(customerId);
  }

  @Get('invoices/:id')
  @ApiOperation({
    summary: 'Get invoice details',
    description:
      'Fetches details of a specific invoice. Enforces tenant isolation (404 if cross-tenant).',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Target customer ID (Allowed for ADMIN only)',
  })
  @ApiResponse({ status: 200, type: PortalInvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found or belongs to another tenant' })
  async getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalInvoiceResponseDto> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getInvoice(customerId, id);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({
    summary: 'Download / view official invoice PDF metadata',
    description: 'Provides official invoice receipt and PDF download payload for self-service billing.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Target customer ID (Allowed for ADMIN only)',
  })
  @ApiResponse({ status: 200, description: 'PDF metadata and printable invoice object' })
  async getInvoicePdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ) {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getInvoicePdf(customerId, id);
  }

  @Post('subscriptions/:id/close')
  @ApiOperation({
    summary: 'Early closure of subscription by customer',
    description:
      'Allows customer to close an active subscription early ONLY if the underlying Plan policy flag `allowEarlyClose` is true. Throws 400 Bad Request if disabled.',
  })
  @ApiParam({ name: 'id', description: 'Subscription UUID to close' })
  @ApiQuery({
    name: 'customerId',
    required: false,
    description: 'Target customer ID (Allowed for ADMIN only)',
  })
  @ApiResponse({ status: 200, type: CloseSubscriptionResponseDto })
  @ApiResponse({ status: 400, description: 'Plan policy does not permit early closure' })
  @ApiResponse({ status: 404, description: 'Subscription not found' })
  async closeSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<CloseSubscriptionResponseDto> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.closeSubscription(customerId, id);
  }
}
