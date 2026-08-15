import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Server } from 'http';
import { AppModule } from '../../src/app.module';
import { Clock } from '../../src/common/clock/clock';
import { FixedClock } from '../../src/common/clock/fixed-clock';

export const TEST_NOW = new Date('2026-01-01T00:00:00.000Z');

/**
 * Boots the real AppModule so the global validation pipe and exception filter are
 * exercised exactly as in production, with only the clock replaced so account
 * creation instants, and therefore promotional windows, are deterministic.
 */
export async function createTestApp(
  now: Date = TEST_NOW,
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(Clock)
    .useValue(new FixedClock(now))
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export const httpServer = (app: INestApplication): Server =>
  app.getHttpServer() as Server;
