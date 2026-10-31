import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.types';
import { PaymentsService } from './payments.service';
import { VerifyRazorpayPaymentDto } from './payments.dto';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('invoices/:invoiceId/order')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create or resume the Razorpay order for an invoice balance' })
  createOrder(@CurrentUser() user: AuthenticatedUser, @Param('invoiceId', ParseUUIDPipe) invoiceId: string) {
    return this.payments.createOrder(user, invoiceId);
  }

  @Post('verify')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Verify and record a captured Razorpay checkout payment' })
  verify(@CurrentUser() user: AuthenticatedUser, @Body() body: VerifyRazorpayPaymentDto) {
    return this.payments.verifyCheckoutPayment(user, body);
  }

}
