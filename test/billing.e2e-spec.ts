import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, httpServer } from './helpers/create-test-app';
import {
  GOLDEN_ACCOUNT,
  GOLDEN_BILL_REQUEST,
  GOLDEN_CURRENCY,
} from './helpers/fixtures';

describe('Billing (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    app = await createTestApp();
    await request(httpServer(app))
      .post('/currencies')
      .send(GOLDEN_CURRENCY)
      .expect(201);
    await request(httpServer(app))
      .post('/accounts')
      .send(GOLDEN_ACCOUNT)
      .expect(201);
  });

  afterEach(async () => {
    await app.close();
  });

  const bill = (payload: object, accountId = 'acc-001') =>
    request(httpServer(app)).post(`/accounts/${accountId}/bill`).send(payload);

  describe('POST /accounts/:accountId/bill', () => {
    it('returns the worked example in full', async () => {
      const response = await bill(GOLDEN_BILL_REQUEST).expect(200);

      expect(response.body).toEqual({
        accountId: 'acc-001',
        accountCurrency: 'USDT',
        billingCurrency: 'GBP',
        billingPeriod: {
          start: '2026-01-01',
          end: '2026-03-01',
          days: 59,
          months: 2,
        },
        breakdown: {
          baseFee: { minorUnits: 6000, amount: '60.00' },
          transactionFees: { minorUnits: 7500, amount: '75.00' },
          subtotal: { minorUnits: 13_500, amount: '135.00' },
          discount: { minorUnits: 1030, amount: '10.30' },
        },
        total: { minorUnits: 12_470, amount: '124.70' },
        details: {
          monthlyFee: { minorUnits: 3000, amount: '30.00' },
          transactionFee: { minorUnits: 25, amount: '0.25' },
          transactionCount: 500,
          transactionThreshold: 100,
          effectiveThreshold: 200,
          chargeableTransactions: 300,
          discountRatePercent: 10,
          discountDays: 45,
          discountedDays: 45,
        },
      });
    });

    it('reconciles the breakdown to the total', async () => {
      const { breakdown, total } = (await bill(GOLDEN_BILL_REQUEST).expect(200))
        .body;

      expect(breakdown.subtotal.minorUnits).toBe(
        breakdown.baseFee.minorUnits + breakdown.transactionFees.minorUnits,
      );
      expect(total.minorUnits).toBe(
        breakdown.subtotal.minorUnits - breakdown.discount.minorUnits,
      );
    });

    it('bills a whole calendar month as exactly one month', async () => {
      const response = await bill({
        billingPeriodStart: '2026-01-01',
        billingPeriodEnd: '2026-02-01',
        transactionCount: 0,
      }).expect(200);

      expect(response.body.billingPeriod.months).toBe(1);
      expect(response.body.breakdown.baseFee.minorUnits).toBe(3000);
    });

    it('bills 2026-01-01 to 2026-01-31 as 30 of January 31 days, the period end being exclusive', async () => {
      const response = await bill({
        billingPeriodStart: '2026-01-01',
        billingPeriodEnd: '2026-01-31',
        transactionCount: 0,
      }).expect(200);

      expect(response.body.billingPeriod.days).toBe(30);
      expect(response.body.breakdown.baseFee.amount).toBe('29.03');
    });

    it('produces an identical bill however the same UTC day is expressed', async () => {
      const asDate = await bill({
        billingPeriodStart: '2026-01-01',
        billingPeriodEnd: '2026-02-01',
        transactionCount: 250,
      }).expect(200);
      const asOffsetInstant = await bill({
        billingPeriodStart: '2026-01-01T02:00:00+02:00',
        billingPeriodEnd: '2026-02-01T02:00:00+02:00',
        transactionCount: 250,
      }).expect(200);

      expect(asOffsetInstant.body).toEqual(asDate.body);
    });

    it('applies no discount to a period the promotion does not reach', async () => {
      const response = await bill({
        billingPeriodStart: '2025-01-01',
        billingPeriodEnd: '2025-02-01',
        transactionCount: 250,
      }).expect(200);

      expect(response.body.details.discountedDays).toBe(0);
      expect(response.body.breakdown.discount.minorUnits).toBe(0);
    });

    it('returns 413 rather than 500 for an oversized body', async () => {
      const response = await bill({
        ...GOLDEN_BILL_REQUEST,
        padding: 'a'.repeat(200_000),
      }).expect(413);

      expect(response.body.statusCode).toBe(413);
      expect(response.body.code).not.toBe('INTERNAL_ERROR');
    });

    it('returns 404 for an unknown account', async () => {
      const response = await bill(GOLDEN_BILL_REQUEST, 'missing').expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        code: 'ACCOUNT_NOT_FOUND',
        path: '/accounts/missing/bill',
      });
    });

    it.each([
      [
        'a zero length period',
        { billingPeriodStart: '2026-01-01', billingPeriodEnd: '2026-01-01' },
      ],
      [
        'an end before the start',
        { billingPeriodStart: '2026-02-01', billingPeriodEnd: '2026-01-01' },
      ],
      [
        'two instants on the same UTC day',
        {
          billingPeriodStart: '2026-01-01T00:00:00Z',
          billingPeriodEnd: '2026-01-01T23:59:00Z',
        },
      ],
      ['a month that does not exist', { billingPeriodEnd: '2026-13-01' }],
      [
        'a datetime with no UTC offset',
        { billingPeriodStart: '2026-01-01T00:00:00' },
      ],
      ['a non ISO date', { billingPeriodStart: '01/01/2026' }],
      [
        'a period beyond the maximum length',
        { billingPeriodEnd: '2036-03-01' },
      ],
      ['a negative transaction count', { transactionCount: -1 }],
      ['a fractional transaction count', { transactionCount: 1.5 }],
      ['a numeric string transaction count', { transactionCount: '500' }],
      ['an unknown field', { unexpected: true }],
    ])('returns 400 for %s', async (_name, override) => {
      const response = await bill({
        ...GOLDEN_BILL_REQUEST,
        ...override,
      }).expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_FAILED',
      });
      expect(Array.isArray(response.body.details)).toBe(true);
    });
  });
});
