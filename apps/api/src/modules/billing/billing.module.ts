import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({ imports: [NotificationsModule], controllers: [BillingController], providers: [BillingService, PrismaService] })
export class BillingModule {}
