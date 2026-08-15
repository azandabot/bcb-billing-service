import { ceilDiv } from '../../common/math/integer-math';
import { DayRange } from '../../common/time/day-range';
import { Bill, BillingRequest, BillingRules } from './billing.types';
import { MonthFraction } from './month-fraction';

const BASIS_POINTS_IN_WHOLE = 10_000;

/**
 * The billing rules, as a pure function of its inputs. No framework, no I/O and no
 * access to the current time, so every scenario is reachable from a unit test.
 *
 *   baseFee            = monthlyFee x months
 *   effectiveThreshold = ceil(transactionThreshold x months)
 *   transactionFees    = max(0, transactionCount - effectiveThreshold) x transactionFee
 *   discount           = (baseFee + transactionFees) x promoOverlapDays/periodDays x rate
 *   total              = baseFee + transactionFees - discount
 *
 * The same months figure scales both the fee and the allowance, so a period of any
 * length stays internally consistent. Only baseFee and discount are rounded, once
 * each; total is the difference of already-rounded integers, so the breakdown
 * reconciles by construction rather than by coincidence.
 */
export function calculateBill(
  rules: BillingRules,
  request: BillingRequest,
): Bill {
  const { period, transactionCount } = request;
  const months = period.months();

  const baseFee = rules.monthlyFee.scale(months.scaled, MonthFraction.scale);

  const effectiveThreshold = ceilDiv(
    rules.transactionThreshold * months.scaled,
    MonthFraction.scale,
  );
  const chargeableTransactions = Math.max(
    0,
    transactionCount - effectiveThreshold,
  );
  const transactionFees = rules.transactionFee.times(chargeableTransactions);

  const subtotal = baseFee.plus(transactionFees);

  const promotion = DayRange.halfOpen(
    rules.accountOpenedOn,
    rules.accountOpenedOn.plusDays(rules.discountDays),
  );
  const discountedDays = period.overlapDaysWith(promotion);
  const discount = subtotal.scale(
    discountedDays * rules.discountRateBasisPoints,
    period.days * BASIS_POINTS_IN_WHOLE,
  );

  return {
    period,
    breakdown: {
      baseFee,
      transactionFees,
      subtotal,
      discount,
      total: subtotal.minus(discount),
    },
    explanation: {
      months,
      periodDays: period.days,
      transactionCount,
      effectiveThreshold,
      chargeableTransactions,
      discountedDays,
    },
  };
}
