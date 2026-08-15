import { DayRange } from './day-range';
import { InvalidDateError, UtcDay } from './utc-day';

const day = (value: string): UtcDay => UtcDay.fromIsoString(value);
const range = (start: string, end: string): DayRange =>
  DayRange.halfOpen(day(start), day(end));

describe('DayRange', () => {
  const january = range('2026-01-01', '2026-02-01');

  it.each([
    ['disjoint before', '2025-11-01', '2025-12-01', 0],
    ['touching before', '2025-12-01', '2026-01-01', 0],
    ['overlapping the start', '2025-12-20', '2026-01-10', 9],
    ['contained', '2026-01-10', '2026-01-20', 10],
    ['containing', '2025-12-01', '2026-03-01', 31],
    ['overlapping the end', '2026-01-25', '2026-02-10', 7],
    ['touching after', '2026-02-01', '2026-03-01', 0],
    ['disjoint after', '2026-03-01', '2026-04-01', 0],
    ['empty', '2026-01-10', '2026-01-10', 0],
  ])('reports %s as %p overlapping days', (_name, start, end, expected) => {
    expect(january.overlapDaysWith(range(start, end))).toBe(expected);
  });

  it('is symmetric', () => {
    const other = range('2025-12-20', '2026-01-10');

    expect(january.overlapDaysWith(other)).toBe(other.overlapDaysWith(january));
  });

  it('counts its own days', () => {
    expect(january.days).toBe(31);
  });

  it('allows an empty range, as a zero day promotion produces', () => {
    expect(range('2026-01-01', '2026-01-01').days).toBe(0);
  });

  it('rejects a reversed range', () => {
    expect(() => range('2026-02-01', '2026-01-01')).toThrow(InvalidDateError);
  });
});
