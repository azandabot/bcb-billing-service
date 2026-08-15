import { Injectable } from '@nestjs/common';
import { Account } from '../domain/account';
import { AccountRepository } from '../domain/account.repository';

@Injectable()
export class InMemoryAccountRepository extends AccountRepository {
  private readonly accounts = new Map<string, Account>();

  save(account: Account): Promise<void> {
    this.accounts.set(account.accountId, account);
    return Promise.resolve();
  }

  findById(accountId: string): Promise<Account | undefined> {
    return Promise.resolve(this.accounts.get(accountId));
  }
}
