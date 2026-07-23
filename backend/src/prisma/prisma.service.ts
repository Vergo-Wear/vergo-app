import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

function positiveIntegerFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger: Logger;
  private pool: Pool;

  constructor() {
    const logger = new Logger(PrismaService.name);
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required');
    }
    const pool = new Pool({
      connectionString,
      max: positiveIntegerFromEnv('DATABASE_POOL_MAX', 5),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: positiveIntegerFromEnv(
        'DATABASE_CONNECTION_TIMEOUT_MS',
        30000,
      ),
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool, {
      onPoolError: (error) =>
        logger.error(
          'PostgreSQL idle connection failed',
          error.stack ?? error.message,
        ),
    });
    super({
      adapter,
      transactionOptions: {
        maxWait: positiveIntegerFromEnv(
          'DATABASE_TRANSACTION_MAX_WAIT_MS',
          10000,
        ),
        timeout: positiveIntegerFromEnv(
          'DATABASE_TRANSACTION_TIMEOUT_MS',
          20000,
        ),
      },
    });
    this.logger = logger;
    this.pool = pool;

    const databaseUrl = new URL(connectionString);
    if (
      databaseUrl.hostname.endsWith('.pooler.supabase.com') &&
      databaseUrl.port === '6543'
    ) {
      this.logger.warn(
        'DATABASE_URL uses the Supabase transaction pooler. Use the Session Pooler URL on port 5432 for this persistent backend.',
      );
    }
  }

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'test') {
      await this.$connect();
    }
  }

  async onModuleDestroy() {
    if (process.env.NODE_ENV !== 'test') {
      await this.$disconnect();
      if (this.pool) {
        await this.pool.end();
      }
    }
  }
}
