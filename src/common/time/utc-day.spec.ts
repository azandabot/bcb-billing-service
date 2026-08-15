import { InvalidDateError, UtcDay } from './utc-day';

describe('UtcDay', () => {
  describe('fromIsoString', () => {
    it.each([
      ['2026-01-15', '2026-01-15'],
      ['2026-01-15T00:00:00Z', '2026-01-15'],
      ['2026-01-15T23:30:00+02:00', '2026-01-15'],
      ['2026-01-16T00:30:00+02:00', '2026-01-15'],
      ['2026-01-15T23:30:00-05:00', '2026-01-16'],
    ])('truncates %p to the UTC day %p', (input, expected) => {
      expect(UtcDay.fromIsoString(input).toIsoDate()).toBe(expected);
    });

    it('rejects an unparseable date', () => {
      expect(() => UtcDay.fromIsoString('not-a-date')).toThrow(
        InvalidDateError,
      );
    });
  });

  describe('timezone independence', () => {
    const originalTimezone = process.env.TZ;

    afterAll(() => {
      process.env.TZ = originalTimezone;
    });

    it.each([
      'Pacific/Kiritimati',
      'Africa/Johannesburg',
      'America/Los_Angeles',
    ])('resolves the same UTC day when the server runs in %s', (timezone) => {
      process.env.TZ = timezone;

      expect(UtcDay.fromIsoString('2026-01-15T00:00:00Z').toIsoDate()).toBe(
        '2026-01-15',
      );
      expect(UtcDay.fromIsoString('2026-01-15').toIsoDate()).toBe('2026-01-15');
      expect(UtcDay.fromParts(2026, 0, 15).toIsoDate()).toBe('2026-01-15');
    });
  });

  describe('arithmetic', () => {
    it('adds days across a leap day', () => {
      expect(UtcDay.fromIsoString('2024-02-28').plusDays(1).toIsoDate()).toBe(
        '2024-02-29',
      );
      expect(UtcDay.fromIsoString('2024-02-28').plusDays(2).toIsoDate()).toBe(
        '2024-03-01',
      );
    });

    it('adds days across a year boundary', () => {
      expect(UtcDay.fromIsoString('2025-12-31').plusDays(1).toIsoDate()).toBe(
        '2026-01-01',
      );
    });

    it('rejects a fractional number of days', () => {
      expect(() => UtcDay.fromIsoString('2026-01-01').plusDays(1.5)).toThrow(
        InvalidDateError,
      );
    });

    it('measures the days between two days', () => {
      const start = UtcDay.fromIsoString('2026-01-01');

      expect(start.daysUntil(UtcDay.fromIsoString('2026-02-01'))).toBe(31);
      expect(start.daysUntil(start)).toBe(0);
      expect(start.daysUntil(UtcDay.fromIsoString('2025-12-31'))).toBe(-1);
    });

    it('compares days', () => {
      const first = UtcDay.fromIsoString('2026-01-01');
      const second = UtcDay.fromIsoString('2026-01-02');

      expect(first.isBefore(second)).toBe(true);
      expect(second.isBefore(first)).toBe(false);
      expect(first.isBefore(UtcDay.fromIsoString('2026-01-01'))).toBe(false);
    });
  });

  describe('calendar', () => {
    it.each([
      ['2026-01-10', 31],
      ['2026-02-10', 28],
      ['2024-02-10', 29],
      ['2026-04-10', 30],
    ])('reports %p as having %p days in its month', (day, days) => {
      expect(UtcDay.fromIsoString(day).daysInMonth).toBe(days);
    });

    it('finds the start of the next month, including across a year boundary', () => {
      expect(
        UtcDay.fromIsoString('2026-01-15').startOfNextMonth().toIsoDate(),
      ).toBe('2026-02-01');
      expect(
        UtcDay.fromIsoString('2026-12-15').startOfNextMonth().toIsoDate(),
      ).toBe('2027-01-01');
    });

    it('exposes the calendar year and month index', () => {
      const day = UtcDay.fromIsoString('2026-03-15');

      expect(day.year).toBe(2026);
      expect(day.monthIndex).toBe(2);
    });

    it('converts back to an instant at midnight UTC', () => {
      expect(UtcDay.fromIsoString('2026-01-15').toDate().toISOString()).toBe(
        '2026-01-15T00:00:00.000Z',
      );
    });
  });
});
