import { Module, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditEntry { userId?: string; action: string; entity: string; entityId?: string; ipAddress?: string; }
@Injectable()
export class AuditService {
  public constructor(private readonly prisma: PrismaService) {}
  public async log(entry: AuditEntry): Promise<void> { await this.prisma.auditLog.create({ data: { userId: entry.userId, action: entry.action, entity: entry.entity, entityId: entry.entityId ?? 'system', ipAddress: entry.ipAddress } }); }
}
@Module({ providers: [AuditService, PrismaService], exports: [AuditService] })
export class AuditModule {}
