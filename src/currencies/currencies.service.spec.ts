import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { InvalidMoneyAmountError } from '../common/money/money';
import { configuration } from '../config/configuration';
import { CurrenciesService } from './currencies.service';
import {
  CurrencyAlreadyExistsError,
  CurrencyNotRegisteredError,
} from './domain/currency.errors';
import { CurrencyRepository } from './domain/currency.repository';
import { InMemoryCurrencyRepository } from './infrastructure/in-memory-currency.repository';

describe('CurrenciesService', () => {
  let service: CurrenciesService;

  async function buildService(
    transactionFeeGbp = '0.30',
  ): Promise<CurrenciesService> {
    process.env.TRANSACTION_FEE_GBP = transactionFeeGbp;
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [configuration],
        }),
      ],
      providers: [
        CurrenciesService,
        { provide: CurrencyRepository, useClass: InMemoryCurrencyRepository },
      ],
    }).compile();
    return module.get(CurrenciesService);
  }

  beforeEach(async () => {
    service = await buildService();
  });

  afterAll(() => {
    delete process.env.TRANSACTION_FEE_GBP;
  });

  describe('register', () => {
    it('stores the monthly fee in pence', async () => {
      const currency = await service.register({
        currency: 'USDT',
        monthlyFeeGbp: 30,
      });

      expect(currency.code).toBe('USDT');
      expect(currency.monthlyFee.minorUnits).toBe(3000);
    });

    it('falls back to the configured transaction fee when none is supplied', async () => {
      const currency = await service.register({
        currency: 'GBP',
        monthlyFeeGbp: 10,
      });

      expect(currency.transactionFee.minorUnits).toBe(30);
    });

    it('prefers an explicit transaction fee over the configured default', async () => {
      const currency = await service.register({
        currency: 'GBP',
        monthlyFeeGbp: 10,
        transactionFeeGbp: 0.25,
      });

      expect(currency.transactionFee.minorUnits).toBe(25);
    });

    it('snapshots the configured default so later changes do not alter existing tariffs', async () => {
      const registered = await service.register({
        currency: 'GBP',
        monthlyFeeGbp: 10,
      });
      const rebuilt = await buildService('0.99');

      expect(registered.transactionFee.minorUnits).toBe(30);
      expect(
        (await rebuilt.register({ currency: 'GBP', monthlyFeeGbp: 10 }))
          .transactionFee.minorUnits,
      ).toBe(99);
    });

    it('rejects a duplicate currency', async () => {
      await service.register({ currency: 'USDT', monthlyFeeGbp: 30 });

      await expect(
        service.register({ currency: 'USDT', monthlyFeeGbp: 40 }),
      ).rejects.toThrow(CurrencyAlreadyExistsError);
    });

    it('rejects a fee that is not a whole number of pence', async () => {
      await expect(
        service.register({ currency: 'GBP', monthlyFeeGbp: 1.005 }),
      ).rejects.toThrow(InvalidMoneyAmountError);
    });
  });

  describe('getRegistered', () => {
    it('returns a registered currency', async () => {
      await service.register({ currency: 'USDT', monthlyFeeGbp: 30 });

      await expect(service.getRegistered('USDT')).resolves.toMatchObject({
        code: 'USDT',
      });
    });

    it('rejects an unregistered currency', async () => {
      await expect(service.getRegistered('USDT')).rejects.toThrow(
        CurrencyNotRegisteredError,
      );
    });
  });
});
