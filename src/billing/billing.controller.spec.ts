import { Test, TestingModule } from '@nestjs/testing';
import { Account } from '../accounts/domain/account';
import { Money } from '../common/money/money';
import { UtcDay } from '../common/time/utc-day';
import { Currency } from '../currencies/domain/currency';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BillingPeriod } from './domain/billing-period';
import { calculateBill } from './domain/billing-policy';

describe('BillingController', () => {
  let controller: BillingController;
  const billAccount = jest.fn();

  const request = {
    billingPeriodStart: '2026-01-01',
    billingPeriodEnd: '2026-03-01',
    transactionCount: 500,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BillingController],
      providers: [{ provide: BillingService, useValue: { billAccount } }],
    }).compile();

    controller = module.get(BillingController);
    billAccount.mockReset();
  });

  it('delegates to the service and maps the bill to the response shape', async () => {
    const account = new Account(
      'acc-001',
      'USDT',
      100,
      45,
      1000,
      new Date('2026-01-01T00:00:00.000Z'),
    );
    const currency = new Currency(
      'USDT',
      Money.fromGbp(30),
      Money.fromGbp(0.25),
    );
    const bill = calculateBill(
      {
        monthlyFee: currency.monthlyFee,
        transactionFee: currency.transactionFee,
        transactionThreshold: account.transactionThreshold,
        discountRateBasisPoints: account.discountRateBasisPoints,
        discountDays: account.discountDays,
        accountOpenedOn: account.openedOn,
      },
      {
        period: BillingPeriod.create(
          UtcDay.fromIsoString('2026-01-01'),
          UtcDay.fromIsoString('2026-03-01'),
        ),
        transactionCount: 500,
      },
    );
    billAccount.mockResolvedValue({ account, currency, bill });

    const response = await controller.bill('acc-001', request);

    expect(billAccount).toHaveBeenCalledWith('acc-001', request);
    expect(response).toMatchObject({
      accountId: 'acc-001',
      accountCurrency: 'USDT',
      billingCurrency: 'GBP',
      billingPeriod: {
        start: '2026-01-01',
        end: '2026-03-01',
        days: 59,
        months: 2,
      },
      total: { minorUnits: 12_470, amount: '124.70' },
    });
    expect(response.details.transactionCount).toBe(500);
    expect(response.details.discountRatePercent).toBe(10);
  });

  it('propagates a service failure', async () => {
    billAccount.mockRejectedValue(new Error('not found'));

    await expect(controller.bill('missing', request)).rejects.toThrow(
      'not found',
    );
  });
});
