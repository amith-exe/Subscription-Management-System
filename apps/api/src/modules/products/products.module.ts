import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { PrismaService } from '../../prisma/prisma.service';

@Module({
  providers: [ProductsService, PrismaService],
  exports: [ProductsService],
})
export class ProductsModule {}
