import { Money } from '../../common/money/money';
import { UtcDay } from '../../common/time/utc-day';
import { BillingPeriod } from './billing-period';
import { MonthFraction } from './month-fraction';

export interface BillingRules {
  readonly monthlyFee: Money;
  readonly transactionFee: Money;
  readonly transactionThreshold: number;
  readonly discountRateBasisPoints: number;
  readonly discountDays: number;
  readonly accountOpenedOn: UtcDay;
}

export interface BillingRequest {
  readonly period: BillingPeriod;
  readonly transactionCount: number;
}

export interface BillBreakdown {
  readonly baseFee: Money;
  readonly transactionFees: Money;
  readonly subtotal: Money;
  readonly discount: Money;
  readonly total: Money;
}

/** The intermediate values behind the breakdown, so a bill can be checked by hand. */
export interface BillExplanation {
  readonly months: MonthFraction;
  readonly periodDays: number;
  readonly transactionCount: number;
  readonly effectiveThreshold: number;
  readonly chargeableTransactions: number;
  readonly discountedDays: number;
}

export interface Bill {
  readonly period: BillingPeriod;
  readonly breakdown: BillBreakdown;
  readonly explanation: BillExplanation;
}
