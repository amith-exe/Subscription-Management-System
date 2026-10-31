import { Module } from '@nestjs/common';
import { QuotationsController } from './quotations.controller';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  controllers: [QuotationsController],
  providers: [QuotationsService, PrismaService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
