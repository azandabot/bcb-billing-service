import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { CurrenciesModule } from '../currencies/currencies.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [AccountsModule, CurrenciesModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule {}
