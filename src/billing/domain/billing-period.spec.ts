import { DayRange } from '../../common/time/day-range';
import { UtcDay } from '../../common/time/utc-day';
import {
  BillingPeriod,
  InvalidBillingPeriodError,
  MAX_BILLING_PERIOD_DAYS,
} from './billing-period';
import { MonthFraction } from './month-fraction';

const period = (start: string, end: string): BillingPeriod =>
  BillingPeriod.create(UtcDay.fromIsoString(start), UtcDay.fromIsoString(end));

describe('BillingPeriod', () => {
  describe('create', () => {
    it('rejects a zero length period', () => {
      expect(() => period('2026-01-01', '2026-01-01')).toThrow(
        InvalidBillingPeriodError,
      );
    });

    it('rejects a reversed period', () => {
      expect(() => period('2026-02-01', '2026-01-01')).toThrow(
        InvalidBillingPeriodError,
      );
    });

    it('rejects a period longer than the maximum', () => {
      const start = UtcDay.fromIsoString('2026-01-01');

      expect(() =>
        BillingPeriod.create(
          start,
          start.plusDays(MAX_BILLING_PERIOD_DAYS + 1),
        ),
      ).toThrow(InvalidBillingPeriodError);
      expect(() =>
        BillingPeriod.create(start, start.plusDays(MAX_BILLING_PERIOD_DAYS)),
      ).not.toThrow();
    });
  });

  it('counts whole days, excluding the end', () => {
    expect(period('2026-01-01', '2026-02-01').days).toBe(31);
    expect(period('2026-01-01', '2026-01-02').days).toBe(1);
  });

  it.each([
    ['2026-01-01', '2026-02-01', 377_580],
    ['2026-01-01', '2026-01-31', 365_400],
    ['2024-02-01', '2024-03-01', 377_580],
    ['2026-01-15', '2026-02-15', 395_850],
    ['2024-01-01', '2027-01-01', 13_592_880],
  ])('sums %p to %p as %p scaled months', (start, end, scaled) => {
    expect(period(start, end).months().scaled).toBe(scaled);
  });

  it('tiles consecutive periods without double counting', () => {
    const first = period('2026-01-01', '2026-02-01').months().scaled;
    const second = period('2026-02-01', '2026-03-01').months().scaled;

    expect(first + second).toBe(2 * MonthFraction.scale);
  });

  it('exposes itself as a day range for overlap', () => {
    const january = period('2026-01-01', '2026-02-01');
    const promotion = DayRange.halfOpen(
      UtcDay.fromIsoString('2026-01-01'),
      UtcDay.fromIsoString('2026-01-11'),
    );

    expect(january.range.days).toBe(31);
    expect(january.overlapDaysWith(promotion)).toBe(10);
  });
});
