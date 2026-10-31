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

    // For ADMIN, allow query override or fallback to admin's customerId
    if (queryCustomerId) {
      return queryCustomerId;
    }
    if (user.customerId) {
      return user.customerId;
    }
    throw new BadRequestException('Admin must supply ?customerId query parameter to view tenant portal');
  }

  @Get('subscriptions')
  @ApiOperation({ summary: 'List customer subscriptions with plan and variant items' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Admin override tenant filter' })
  @ApiResponse({ status: 200, type: [PortalSubscriptionResponseDto] })
  async getSubscriptions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalSubscriptionResponseDto[]> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getSubscriptions(customerId);
  }

  @Get('subscriptions/:id')
  @ApiOperation({ summary: 'Get single subscription detail (strictly tenant isolated)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Admin override tenant filter' })
  @ApiResponse({ status: 200, type: PortalSubscriptionResponseDto })
  @ApiResponse({ status: 404, description: 'Subscription not found for this tenant' })
  async getSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalSubscriptionResponseDto> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getSubscription(customerId, id);
  }

  @Get('invoices')
  @ApiOperation({ summary: 'List all invoices and receipts for the customer' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Admin override tenant filter' })
  @ApiResponse({ status: 200, type: [PortalInvoiceResponseDto] })
  async getInvoices(
    @CurrentUser() user: AuthenticatedUser,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalInvoiceResponseDto[]> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getInvoices(customerId);
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get single invoice detail (strictly tenant isolated)' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Admin override tenant filter' })
  @ApiResponse({ status: 200, type: PortalInvoiceResponseDto })
  @ApiResponse({ status: 404, description: 'Invoice not found for this tenant' })
  async getInvoice(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<PortalInvoiceResponseDto> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getInvoice(customerId, id);
  }

  @Get('invoices/:id/pdf')
  @ApiOperation({ summary: 'Download or view formatted PDF receipt for customer invoice' })
  @ApiParam({ name: 'id', description: 'Invoice ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Admin override tenant filter' })
  @ApiResponse({ status: 200, description: 'Invoice receipt structured data for PDF printing' })
  @ApiResponse({ status: 404, description: 'Invoice not found for this tenant' })
  async getInvoicePdf(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ) {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.getInvoicePdf(customerId, id);
  }

  @Post('subscriptions/:id/close')
  @ApiOperation({ summary: 'Early cancel subscription (allowed only if plan.allowEarlyClose === true)' })
  @ApiParam({ name: 'id', description: 'Subscription ID' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Admin override tenant filter' })
  @ApiResponse({ status: 200, type: CloseSubscriptionResponseDto })
  @ApiResponse({ status: 400, description: 'Plan policy does not permit early cancellation' })
  @ApiResponse({ status: 404, description: 'Subscription not found for this tenant' })
  async closeSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query('customerId') queryCustomerId?: string,
  ): Promise<CloseSubscriptionResponseDto> {
    const customerId = this.resolveCustomerId(user, queryCustomerId);
    return this.portalService.closeSubscription(customerId, id);
  }
}
