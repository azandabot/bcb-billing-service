import { Injectable } from '@nestjs/common';
import { Clock } from '../common/clock/clock';
import { CurrenciesService } from '../currencies/currencies.service';
import { Account, BASIS_POINTS_PER_PERCENT } from './domain/account';
import {
  AccountAlreadyExistsError,
  AccountNotFoundError,
} from './domain/account.errors';
import { AccountRepository } from './domain/account.repository';
import { CreateAccountDto } from './dto/create-account.dto';

@Injectable()
export class AccountsService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly currenciesService: CurrenciesService,
    private readonly clock: Clock,
  ) {}

  async open(dto: CreateAccountDto): Promise<Account> {
    if (await this.accounts.findById(dto.accountId)) {
      throw new AccountAlreadyExistsError(dto.accountId);
    }
    // The call is for the throw, not the return
    await this.currenciesService.getRegistered(dto.currency);
    const account = new Account(
      dto.accountId,
      dto.currency,
      dto.transactionThreshold,
      dto.discountDays,
      Math.round(dto.discountRate * BASIS_POINTS_PER_PERCENT),
      this.clock.now(),
    );
    await this.accounts.save(account);
    return account;
  }

  async getById(accountId: string): Promise<Account> {
    const account = await this.accounts.findById(accountId);
    if (!account) {
      throw new AccountNotFoundError(accountId);
    }
    return account;
  }
}
