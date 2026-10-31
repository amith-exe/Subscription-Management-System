import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProductsModule } from '../products/products.module';
import { TaxesModule } from '../taxes/taxes.module';
import { PlansModule } from '../plans/plans.module';
import { QuotationsModule } from '../quotations/quotations.module';

@Module({
  imports: [ProductsModule, TaxesModule, PlansModule, QuotationsModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PrismaService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
