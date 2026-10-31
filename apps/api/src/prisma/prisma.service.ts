import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

type UnwrapTuple<T extends readonly unknown[]> = {
  [K in keyof T]: T[K] extends Prisma.PrismaPromise<infer Value> ? Value : never;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  public $transaction<R>(
    callback: (transaction: PrismaService) => Promise<R>,
    options?: { maxWait?: number; timeout?: number; isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<R>;
  public $transaction<P extends Prisma.PrismaPromise<unknown>[]>(
    operations: [...P],
    options?: { isolationLevel?: Prisma.TransactionIsolationLevel },
  ): Promise<UnwrapTuple<P>>;
  public $transaction<R>(
    callbackOrOperations: ((transaction: PrismaService) => Promise<R>) | Prisma.PrismaPromise<unknown>[],
    options?: Record<string, unknown>,
  ): Promise<R> {
    return super.$transaction(
      callbackOrOperations as never,
      options as never,
    ) as Promise<R>;
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }
}
