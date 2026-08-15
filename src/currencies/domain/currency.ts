import { Money } from '../../common/money/money';

/**
 * A tariff, keyed by currency code. Both fees are resolved and stored when the
 * currency is registered, so a later configuration change cannot alter the price
 * of an existing account's bills.
 */
export class Currency {
  constructor(
    readonly code: string,
    readonly monthlyFee: Money,
    readonly transactionFee: Money,
  ) {
    Object.freeze(this);
  }
}
