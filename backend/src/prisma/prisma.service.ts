import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('Connected to PostgreSQL database successfully.');
    } catch (err) {
      console.warn('PostgreSQL connection deferred or not reachable yet:', err.message);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
