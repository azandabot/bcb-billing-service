import { Test, TestingModule } from '@nestjs/testing';
import { Money } from '../common/money/money';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { Currency } from './domain/currency';

describe('CurrenciesController', () => {
  let controller: CurrenciesController;
  const register = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CurrenciesController],
      providers: [{ provide: CurrenciesService, useValue: { register } }],
    }).compile();

    controller = module.get(CurrenciesController);
    register.mockReset();
  });

  it('delegates to the service and maps the tariff to the response shape', async () => {
    register.mockResolvedValue(
      new Currency('USDT', Money.fromGbp(30), Money.fromGbp(0.25)),
    );
    const dto = {
      currency: 'USDT',
      monthlyFeeGbp: 30,
      transactionFeeGbp: 0.25,
    };

    await expect(controller.create(dto)).resolves.toEqual({
      currency: 'USDT',
      monthlyFee: { minorUnits: 3000, amount: '30.00' },
      transactionFee: { minorUnits: 25, amount: '0.25' },
    });
    expect(register).toHaveBeenCalledWith(dto);
  });

  it('propagates a service failure', async () => {
    register.mockRejectedValue(new Error('already registered'));

    await expect(
      controller.create({ currency: 'USDT', monthlyFeeGbp: 30 }),
    ).rejects.toThrow('already registered');
  });
});
