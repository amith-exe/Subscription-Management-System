import { Module } from '@nestjs/common';
import { QuotationsService } from './quotations.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [QuotationsService, PrismaService],
  exports: [QuotationsService],
})
export class QuotationsModule {}
