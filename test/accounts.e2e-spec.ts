import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, httpServer, TEST_NOW } from './helpers/create-test-app';
import { GOLDEN_ACCOUNT, GOLDEN_CURRENCY } from './helpers/fixtures';

describe('Accounts (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createTestApp();
    await request(httpServer(app))
      .post('/currencies')
      .send(GOLDEN_CURRENCY)
      .expect(201);
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (payload: object) =>
    request(httpServer(app)).post('/accounts').send(payload);

  describe('POST /accounts', () => {
    it('opens an account using the exact payload from the brief', async () => {
      const response = await post(GOLDEN_ACCOUNT).expect(201);

      expect(response.body).toEqual({
        accountId: 'acc-001',
        currency: 'USDT',
        transactionThreshold: 100,
        discountDays: 45,
        discountRatePercent: 10,
        createdAt: TEST_NOW.toISOString(),
        openedOn: '2026-01-01',
      });
    });

    it('rejects an account for a currency that is not registered', async () => {
      const response = await post({
        ...GOLDEN_ACCOUNT,
        currency: 'BTC',
      }).expect(422);

      expect(response.body).toMatchObject({
        statusCode: 422,
        code: 'CURRENCY_NOT_REGISTERED',
        path: '/accounts',
      });
    });

    it('rejects a duplicate accountId', async () => {
      await post(GOLDEN_ACCOUNT).expect(201);

      const response = await post(GOLDEN_ACCOUNT).expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        code: 'ACCOUNT_ALREADY_EXISTS',
      });
    });

    it.each([0, 100, 12.5])(
      'accepts a discount rate of %p percent',
      async (discountRate) => {
        await post({ ...GOLDEN_ACCOUNT, discountRate }).expect(201);
      },
    );

    it.each([
      ['a discount rate above 100', { discountRate: 101 }],
      ['a negative discount rate', { discountRate: -1 }],
      ['a fractional threshold', { transactionThreshold: 1.5 }],
      ['a negative threshold', { transactionThreshold: -1 }],
      ['fractional discount days', { discountDays: 1.5 }],
      ['an accountId containing a slash', { accountId: 'acc/001' }],
      ['an accountId starting with punctuation', { accountId: '-acc' }],
      ['an empty accountId', { accountId: '' }],
      ['an unknown field', { unexpected: true }],
    ])('rejects %s', async (_name, override) => {
      const response = await post({ ...GOLDEN_ACCOUNT, ...override }).expect(
        400,
      );

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
      });
    });

    it('rejects a missing payload', async () => {
      await post({}).expect(400);
    });
  });
});
