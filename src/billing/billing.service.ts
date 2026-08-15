import { Injectable } from '@nestjs/common';
import { AccountsService } from '../accounts/accounts.service';
import { Account } from '../accounts/domain/account';
import { UtcDay } from '../common/time/utc-day';
import { CurrenciesService } from '../currencies/currencies.service';
import { Currency } from '../currencies/domain/currency';
import { AccountBill } from './account-bill.type';
import { BillingPeriod } from './domain/billing-period';
import { calculateBill } from './domain/billing-policy';
import { BillingRules } from './domain/billing.types';
import { CreateBillDto } from './dto/create-bill.dto';

@Injectable()
export class BillingService {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly currenciesService: CurrenciesService,
  ) {}

  async billAccount(
    accountId: string,
    dto: CreateBillDto,
  ): Promise<AccountBill> {
    const account = await this.accountsService.getById(accountId);
    const currency = await this.currenciesService.getRegistered(
      account.currencyCode,
    );
    const period = BillingPeriod.create(
      UtcDay.fromIsoString(dto.billingPeriodStart),
      UtcDay.fromIsoString(dto.billingPeriodEnd),
    );
    const bill = calculateBill(toBillingRules(account, currency), {
      period,
      transactionCount: dto.transactionCount,
    });
    return { account, currency, bill };
  }
}

function toBillingRules(account: Account, currency: Currency): BillingRules {
  return {
    monthlyFee: currency.monthlyFee,
    transactionFee: currency.transactionFee,
    transactionThreshold: account.transactionThreshold,
    discountRateBasisPoints: account.discountRateBasisPoints,
    discountDays: account.discountDays,
    accountOpenedOn: account.openedOn,
  };
}
