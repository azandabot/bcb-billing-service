import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AccountsService } from '../accounts/accounts.service';
import { AccountNotFoundError } from '../accounts/domain/account.errors';
import { AccountRepository } from '../accounts/domain/account.repository';
import { InMemoryAccountRepository } from '../accounts/infrastructure/in-memory-account.repository';
import { Clock } from '../common/clock/clock';
import { FixedClock } from '../common/clock/fixed-clock';
import { configuration } from '../config/configuration';
import { CurrenciesService } from '../currencies/currencies.service';
import { CurrencyRepository } from '../currencies/domain/currency.repository';
import { InMemoryCurrencyRepository } from '../currencies/infrastructure/in-memory-currency.repository';
import { BillingService } from './billing.service';
import { InvalidBillingPeriodError } from './domain/billing-period';

describe('BillingService', () => {
  let service: BillingService;
  let accountsService: AccountsService;
  let currenciesService: CurrenciesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [configuration],
        }),
      ],
      providers: [
        BillingService,
        AccountsService,
        CurrenciesService,
        { provide: AccountRepository, useClass: InMemoryAccountRepository },
        { provide: CurrencyRepository, useClass: InMemoryCurrencyRepository },
        {
          provide: Clock,
          useValue: new FixedClock(new Date('2026-01-01T00:00:00.000Z')),
        },
      ],
    }).compile();

    service = module.get(BillingService);
    accountsService = module.get(AccountsService);
    currenciesService = module.get(CurrenciesService);

    await currenciesService.register({
      currency: 'USDT',
      monthlyFeeGbp: 30,
      transactionFeeGbp: 0.25,
    });
    await accountsService.open({
      accountId: 'acc-001',
      currency: 'USDT',
      transactionThreshold: 100,
      discountDays: 45,
      discountRate: 10,
    });
  });

  it('bills an account using its currency tariff and its own rules', async () => {
    const { bill, account, currency } = await service.billAccount('acc-001', {
      billingPeriodStart: '2026-01-01',
      billingPeriodEnd: '2026-03-01',
      transactionCount: 500,
    });

    expect(account.accountId).toBe('acc-001');
    expect(currency.code).toBe('USDT');
    expect(bill.breakdown.baseFee.minorUnits).toBe(6000);
    expect(bill.breakdown.transactionFees.minorUnits).toBe(7500);
    expect(bill.breakdown.discount.minorUnits).toBe(1030);
    expect(bill.breakdown.total.minorUnits).toBe(12_470);
  });

  it('bills each account against its own currency tariff', async () => {
    await currenciesService.register({
      currency: 'GBP',
      monthlyFeeGbp: 10,
      transactionFeeGbp: 1,
    });
    await accountsService.open({
      accountId: 'acc-002',
      currency: 'GBP',
      transactionThreshold: 100,
      discountDays: 0,
      discountRate: 0,
    });
    const period = {
      billingPeriodStart: '2026-01-01',
      billingPeriodEnd: '2026-02-01',
      transactionCount: 150,
    };

    const usdt = await service.billAccount('acc-001', period);
    const gbp = await service.billAccount('acc-002', period);

    expect(usdt.currency.code).toBe('USDT');
    expect(usdt.bill.breakdown.baseFee.minorUnits).toBe(3000);
    expect(usdt.bill.breakdown.transactionFees.minorUnits).toBe(1250);
    expect(gbp.currency.code).toBe('GBP');
    expect(gbp.bill.breakdown.baseFee.minorUnits).toBe(1000);
    expect(gbp.bill.breakdown.transactionFees.minorUnits).toBe(5000);
  });

  it('rejects an unknown account', async () => {
    await expect(
      service.billAccount('missing', {
        billingPeriodStart: '2026-01-01',
        billingPeriodEnd: '2026-02-01',
        transactionCount: 0,
      }),
    ).rejects.toThrow(AccountNotFoundError);
  });

  it('rejects a zero length period even when validation is bypassed', async () => {
    await expect(
      service.billAccount('acc-001', {
        billingPeriodStart: '2026-01-01',
        billingPeriodEnd: '2026-01-01',
        transactionCount: 0,
      }),
    ).rejects.toThrow(InvalidBillingPeriodError);
  });

  it('resolves the period from the UTC day, ignoring the offset it was expressed in', async () => {
    const asDate = await service.billAccount('acc-001', {
      billingPeriodStart: '2026-01-01',
      billingPeriodEnd: '2026-02-01',
      transactionCount: 250,
    });
    const asOffsetInstant = await service.billAccount('acc-001', {
      billingPeriodStart: '2026-01-01T02:00:00+02:00',
      billingPeriodEnd: '2026-02-01T02:00:00+02:00',
      transactionCount: 250,
    });

    expect(asOffsetInstant.bill.breakdown.total.minorUnits).toBe(
      asDate.bill.breakdown.total.minorUnits,
    );
  });
});
