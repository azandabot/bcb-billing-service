import { MonthFraction } from './month-fraction';

describe('MonthFraction', () => {
  it.each([28, 29, 30, 31] as const)(
    'treats a full %p day month as exactly one month',
    (days) => {
      expect(MonthFraction.ofDaysInMonth(days, days).scaled).toBe(
        MonthFraction.scale,
      );
    },
  );

  it('divides its scale evenly by every month length', () => {
    for (const days of [28, 29, 30, 31] as const) {
      expect(Number.isInteger(MonthFraction.scale / days)).toBe(true);
    }
  });

  it('adds without loss', () => {
    const half = MonthFraction.ofDaysInMonth(15, 30);

    expect(half.plus(half).scaled).toBe(MonthFraction.scale);
  });

  it('starts at zero and converts a whole month to 1', () => {
    expect(MonthFraction.zero.scaled).toBe(0);
    expect(MonthFraction.ofDaysInMonth(31, 31).toNumber()).toBe(1);
  });
});
