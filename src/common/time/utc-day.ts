import { DomainError } from '../errors/domain-error';
import { DomainErrorCode } from '../errors/domain-error-code';

export class InvalidDateError extends DomainError {
  readonly code: DomainErrorCode = 'INVALID_DATE';
}

const MS_PER_DAY = 86_400_000;

export type DaysInMonth = 28 | 29 | 30 | 31;

/**
 * A calendar day in UTC, held as an integer epoch day. Every date calculation in the
 * service is integer addition or subtraction on this value, so no local-time getter
 * is ever reached and daylight saving cannot alter a bill.
 */
export class UtcDay {
  private constructor(readonly epochDay: number) {
    Object.freeze(this);
  }

  static fromDate(date: Date): UtcDay {
    const time = date.getTime();
    if (Number.isNaN(time)) {
      throw new InvalidDateError('date is not a valid instant');
    }
    return new UtcDay(Math.floor(time / MS_PER_DAY));
  }

  static fromIsoString(value: string): UtcDay {
    return UtcDay.fromDate(new Date(value));
  }

  static fromParts(year: number, monthIndex: number, day: number): UtcDay {
    return UtcDay.fromDate(new Date(Date.UTC(year, monthIndex, day)));
  }

  get year(): number {
    return this.toDate().getUTCFullYear();
  }

  get monthIndex(): number {
    return this.toDate().getUTCMonth();
  }

  get daysInMonth(): DaysInMonth {
    return new Date(
      Date.UTC(this.year, this.monthIndex + 1, 0),
    ).getUTCDate() as DaysInMonth;
  }

  startOfNextMonth(): UtcDay {
    return UtcDay.fromParts(this.year, this.monthIndex + 1, 1);
  }

  plusDays(days: number): UtcDay {
    if (!Number.isSafeInteger(days)) {
      throw new InvalidDateError(`${days} is not a whole number of days`);
    }
    return new UtcDay(this.epochDay + days);
  }

  daysUntil(other: UtcDay): number {
    return other.epochDay - this.epochDay;
  }

  isBefore(other: UtcDay): boolean {
    return this.epochDay < other.epochDay;
  }

  toDate(): Date {
    return new Date(this.epochDay * MS_PER_DAY);
  }

  toIsoDate(): string {
    return this.toDate().toISOString().slice(0, 10);
  }
}
