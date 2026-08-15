import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { Account } from './domain/account';

describe('AccountsController', () => {
  let controller: AccountsController;
  const open = jest.fn();

  const dto = {
    accountId: 'acc-001',
    currency: 'USDT',
    transactionThreshold: 100,
    discountDays: 45,
    discountRate: 12.5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsController],
      providers: [{ provide: AccountsService, useValue: { open } }],
    }).compile();

    controller = module.get(AccountsController);
    open.mockReset();
  });

  it('delegates to the service and converts basis points back to a percentage', async () => {
    open.mockResolvedValue(
      new Account(
        'acc-001',
        'USDT',
        100,
        45,
        1250,
        new Date('2026-01-01T14:22:00.000Z'),
      ),
    );

    await expect(controller.create(dto)).resolves.toEqual({
      accountId: 'acc-001',
      currency: 'USDT',
      transactionThreshold: 100,
      discountDays: 45,
      discountRatePercent: 12.5,
      createdAt: '2026-01-01T14:22:00.000Z',
      openedOn: '2026-01-01',
    });
    expect(open).toHaveBeenCalledWith(dto);
  });

  it('propagates a service failure', async () => {
    open.mockRejectedValue(new Error('already exists'));

    await expect(controller.create(dto)).rejects.toThrow('already exists');
  });
});
