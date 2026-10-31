import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env.validation';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProductsModule } from './modules/products/products.module';
import { PlansModule } from './modules/plans/plans.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { PortalModule } from './modules/portal/portal.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuditModule } from './modules/audit/audit.module';
import { DiscountsModule } from './modules/discounts/discounts.module';
import { MailModule } from './modules/mail/mail.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { MustChangePasswordGuard } from './common/auth/must-change-password.guard';
import { RolesGuard } from './common/auth/roles.guard';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, cache: true, validationSchema: envValidationSchema }), ScheduleModule.forRoot(), MailModule, AuthModule, UsersModule, ProductsModule, PlansModule, SubscriptionsModule, InvoicesModule, BillingModule, DiscountsModule, AnalyticsModule, PortalModule, PaymentsModule, NotificationsModule, AuditModule],
  providers: [PrismaService, JwtAuthGuard, MustChangePasswordGuard, RolesGuard],
  exports: [PrismaService],
})
export class AppModule {}
