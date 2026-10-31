import { Module } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PortalController } from './portal.controller';

@Module({ controllers: [PortalController], providers: [PrismaService] })
export class PortalModule {}
