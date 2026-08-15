import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { Clock } from '../common/clock/clock';
import { FixedClock } from '../common/clock/fixed-clock';
import { configuration } from '../config/configuration';
import { CurrenciesService } from '../currencies/currencies.service';
import { CurrencyNotRegisteredError } from '../currencies/domain/currency.errors';
import { CurrencyRepository } from '../currencies/domain/currency.repository';
import { InMemoryCurrencyRepository } from '../currencies/infrastructure/in-memory-currency.repository';
import { AccountsService } from './accounts.service';
import {
  AccountAlreadyExistsError,
  AccountNotFoundError,
} from './domain/account.errors';
import { AccountRepository } from './domain/account.repository';
import { InMemoryAccountRepository } from './infrastructure/in-memory-account.repository';

const OPENED_AT = new Date('2026-01-01T14:22:00.000Z');

const validAccount = {
  accountId: 'acc-001',
  currency: 'USDT',
  transactionThreshold: 100,
  discountDays: 45,
  discountRate: 10,
};

describe('AccountsService', () => {
  let service: AccountsService;
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
        AccountsService,
        CurrenciesService,
        { provide: AccountRepository, useClass: InMemoryAccountRepository },
        { provide: CurrencyRepository, useClass: InMemoryCurrencyRepository },
        { provide: Clock, useValue: new FixedClock(OPENED_AT) },
      ],
    }).compile();

    service = module.get(AccountsService);
    currenciesService = module.get(CurrenciesService);
    await currenciesService.register({ currency: 'USDT', monthlyFeeGbp: 30 });
  });

  describe('open', () => {
    it('records the creation instant from the injected clock', async () => {
      const account = await service.open(validAccount);

      expect(account.createdAt).toEqual(OPENED_AT);
    });

    it('anchors the promotional window to the UTC day of creation', async () => {
      const account = await service.open(validAccount);

      expect(account.openedOn.toIsoDate()).toBe('2026-01-01');
    });

    it('converts the discount percentage to basis points', async () => {
      const account = await service.open({
        ...validAccount,
        discountRate: 12.5,
      });

      expect(account.discountRateBasisPoints).toBe(1250);
    });

    it('rejects an account for an unregistered currency', async () => {
      await expect(
        service.open({ ...validAccount, currency: 'BTC' }),
      ).rejects.toThrow(CurrencyNotRegisteredError);
    });

    it('rejects a duplicate accountId', async () => {
      await service.open(validAccount);

      await expect(service.open(validAccount)).rejects.toThrow(
        AccountAlreadyExistsError,
      );
    });

    it('does not store an account whose currency is unregistered', async () => {
      await expect(
        service.open({ ...validAccount, currency: 'BTC' }),
      ).rejects.toThrow();

      await expect(service.getById(validAccount.accountId)).rejects.toThrow(
        AccountNotFoundError,
      );
    });
  });

  describe('getById', () => {
    it('returns a stored account', async () => {
      await service.open(validAccount);

      await expect(service.getById('acc-001')).resolves.toMatchObject({
        accountId: 'acc-001',
      });
    });

    it('rejects an unknown account', async () => {
      await expect(service.getById('missing')).rejects.toThrow(
        AccountNotFoundError,
      );
    });
  });
});
