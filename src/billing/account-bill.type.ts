import { Account } from '../accounts/domain/account';
import { Currency } from '../currencies/domain/currency';
import { Bill } from './domain/billing.types';

export interface AccountBill {
  readonly account: Account;
  readonly currency: Currency;
  readonly bill: Bill;
}
