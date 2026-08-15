import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, httpServer } from './helpers/create-test-app';

describe('Currencies (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  const post = (payload: object) =>
    request(httpServer(app)).post('/currencies').send(payload);

  describe('POST /currencies', () => {
    it('registers a currency using the exact payload from the brief', async () => {
      const response = await post({
        currency: 'GBP',
        monthlyFeeGbp: 10,
      }).expect(201);

      expect(response.body).toEqual({
        currency: 'GBP',
        monthlyFee: { minorUnits: 1000, amount: '10.00' },
        transactionFee: { minorUnits: 30, amount: '0.30' },
      });
    });

    it('accepts an explicit per-transaction fee', async () => {
      const response = await post({
        currency: 'USDT',
        monthlyFeeGbp: 30,
        transactionFeeGbp: 0.25,
      }).expect(201);

      expect(response.body.transactionFee).toEqual({
        minorUnits: 25,
        amount: '0.25',
      });
    });

    it.each(['BTC', 'USDC', 'USDT', 'ZAR'])(
      'accepts %s, which is not restricted to ISO 4217 fiat codes',
      async (currency) => {
        await post({ currency, monthlyFeeGbp: 5 }).expect(201);
      },
    );

    it('normalises the code to upper case', async () => {
      const response = await post({
        currency: '  usdt  ',
        monthlyFeeGbp: 30,
      }).expect(201);

      expect(response.body.currency).toBe('USDT');
    });

    it('rejects a duplicate currency regardless of case', async () => {
      await post({ currency: 'usdt', monthlyFeeGbp: 30 }).expect(201);

      const response = await post({
        currency: 'USDT',
        monthlyFeeGbp: 40,
      }).expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        code: 'CURRENCY_ALREADY_EXISTS',
        path: '/currencies',
      });
    });

    it.each([
      ['a missing currency', { monthlyFeeGbp: 10 }],
      ['a missing fee', { currency: 'GBP' }],
      ['an unknown field', { currency: 'GBP', monthlyFeeGbp: 10, rate: 1 }],
      ['a numeric string fee', { currency: 'GBP', monthlyFeeGbp: '10' }],
      ['a fractional penny', { currency: 'GBP', monthlyFeeGbp: 1.005 }],
      ['a negative fee', { currency: 'GBP', monthlyFeeGbp: -1 }],
      ['a one character code', { currency: 'G', monthlyFeeGbp: 10 }],
      ['a code with punctuation', { currency: 'GB-P', monthlyFeeGbp: 10 }],
      [
        'a negative transaction fee',
        { currency: 'GBP', monthlyFeeGbp: 10, transactionFeeGbp: -1 },
      ],
    ])('rejects %s', async (_name, payload) => {
      const response = await post(payload).expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
      });
      expect(Array.isArray(response.body.details)).toBe(true);
    });
  });
});
