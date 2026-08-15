import { DomainError } from '../../common/errors/domain-error';
import { DomainErrorCode } from '../../common/errors/domain-error-code';
import { DayRange } from '../../common/time/day-range';
import { UtcDay } from '../../common/time/utc-day';
import { MonthFraction } from './month-fraction';

export class InvalidBillingPeriodError extends DomainError {
  readonly code: DomainErrorCode = 'INVALID_BILLING_PERIOD';
}

export const MAX_BILLING_PERIOD_DAYS = 3_660;

/**
 * A half-open span of UTC days, [start, end). Half-open so consecutive periods tile
 * without billing the shared boundary day twice.
 *
 * create() rejects empty and reversed periods, which makes a positive day count a
 * class invariant: the calculator can divide by it without guarding against NaN.
 */
export class BillingPeriod {
  private constructor(
    readonly start: UtcDay,
    readonly end: UtcDay,
  ) {
    Object.freeze(this);
  }

  static create(start: UtcDay, end: UtcDay): BillingPeriod {
    const days = start.daysUntil(end);
    if (days <= 0) {
      throw new InvalidBillingPeriodError(
        'billingPeriodEnd must be a later UTC day than billingPeriodStart',
      );
    }
    if (days > MAX_BILLING_PERIOD_DAYS) {
      throw new InvalidBillingPeriodError(
        `a billing period must not exceed ${MAX_BILLING_PERIOD_DAYS} days`,
      );
    }
    return new BillingPeriod(start, end);
  }

  get days(): number {
    return this.start.daysUntil(this.end);
  }

  get range(): DayRange {
    return DayRange.halfOpen(this.start, this.end);
  }

  /** Sums each overlapping calendar month as its own fraction of that month's length. */
  months(): MonthFraction {
    let total = MonthFraction.zero;
    let cursor = this.start;
    while (cursor.isBefore(this.end)) {
      const nextMonth = cursor.startOfNextMonth();
      const segmentEnd = nextMonth.isBefore(this.end) ? nextMonth : this.end;
      total = total.plus(
        MonthFraction.ofDaysInMonth(
          cursor.daysUntil(segmentEnd),
          cursor.daysInMonth,
        ),
      );
      cursor = segmentEnd;
    }
    return total;
  }

  overlapDaysWith(other: DayRange): number {
    return this.range.overlapDaysWith(other);
  }
}
