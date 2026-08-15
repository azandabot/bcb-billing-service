import { DaysInMonth } from '../../common/time/utc-day';

/**
 * lcm(28, 29, 30, 31). Dividing it by any month length yields a whole number, so a
 * span of calendar months accumulates as an exact integer rather than a float sum
 * whose error would change the result of ceil() on the prorated allowance.
 */
const MONTH_SCALE = 377_580;

export class MonthFraction {
  private constructor(readonly scaled: number) {
    Object.freeze(this);
  }

  static readonly scale = MONTH_SCALE;

  static readonly zero = new MonthFraction(0);

  static ofDaysInMonth(days: number, daysInMonth: DaysInMonth): MonthFraction {
    return new MonthFraction(days * (MONTH_SCALE / daysInMonth));
  }

  plus(other: MonthFraction): MonthFraction {
    return new MonthFraction(this.scaled + other.scaled);
  }

  /** Informational only: no billed amount is ever derived from this float. */
  toNumber(): number {
    return this.scaled / MONTH_SCALE;
  }
}
