import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DiscountsModule } from '../discounts/discounts.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

@Module({
  imports: [DiscountsModule, NotificationsModule],
  controllers: [InvoicesController],
  providers: [InvoicesService, PrismaService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
