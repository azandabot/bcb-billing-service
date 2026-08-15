import { Module } from '@nestjs/common';
import { CurrenciesModule } from '../currencies/currencies.module';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { AccountRepository } from './domain/account.repository';
import { InMemoryAccountRepository } from './infrastructure/in-memory-account.repository';

@Module({
  imports: [CurrenciesModule],
  controllers: [AccountsController],
  providers: [
    AccountsService,
    { provide: AccountRepository, useClass: InMemoryAccountRepository },
  ],
  exports: [AccountsService],
})
export class AccountsModule {}
