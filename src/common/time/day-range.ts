import { InvalidDateError, UtcDay } from './utc-day';

/** A half-open range of UTC days, [start, end). May be empty; never reversed. */
export class DayRange {
  private constructor(
    readonly start: UtcDay,
    readonly end: UtcDay,
  ) {
    Object.freeze(this);
  }

  static halfOpen(start: UtcDay, end: UtcDay): DayRange {
    if (end.isBefore(start)) {
      throw new InvalidDateError('a day range may not end before it starts');
    }
    return new DayRange(start, end);
  }

  get days(): number {
    return this.start.daysUntil(this.end);
  }

  overlapDaysWith(other: DayRange): number {
    const start = Math.max(this.start.epochDay, other.start.epochDay);
    const end = Math.min(this.end.epochDay, other.end.epochDay);
    return Math.max(0, end - start);
  }
}
