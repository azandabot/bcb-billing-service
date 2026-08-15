import { InvalidMoneyAmountError, Money } from './money';

describe('Money', () => {
  describe('fromGbp', () => {
    it.each([
      [0, 0],
      [0.07, 7],
      [0.29, 29],
      [1.15, 115],
      [19.99, 1999],
      [30, 3000],
    ])('converts GBP %p to %p pence', (amount, minorUnits) => {
      expect(Money.fromGbp(amount).minorUnits).toBe(minorUnits);
    });

    it('is exact for every two decimal amount up to GBP 1000', () => {
      for (let pence = 0; pence <= 100_000; pence += 1) {
        const gbp = Number((pence / 100).toFixed(2));
        expect(Money.fromGbp(gbp).minorUnits).toBe(pence);
      }
    });

    it.each([1.005, 0.001, 12.345])(
      'rejects %p for having more than two decimal places',
      (amount) => {
        expect(() => Money.fromGbp(amount)).toThrow(InvalidMoneyAmountError);
      },
    );

    it.each([-1, Number.NaN, Number.POSITIVE_INFINITY])(
      'rejects %p',
      (amount) => {
        expect(() => Money.fromGbp(amount)).toThrow(InvalidMoneyAmountError);
      },
    );
  });

  describe('scale', () => {
    it.each([
      [1, 1, 2, 1],
      [3, 1, 2, 2],
      [5, 1, 2, 3],
      [1, 1, 4, 0],
      [3, 3, 4, 2],
      [3000, 395_850, 377_580, 3145],
      [3000, 359_310, 377_580, 2855],
      [3000, 12_180, 377_580, 97],
    ])(
      'scales %p pence by %p/%p to %p pence, rounding half up',
      (pence, numerator, denominator, expected) => {
        expect(
          Money.fromMinorUnits(pence).scale(numerator, denominator).minorUnits,
        ).toBe(expected);
      },
    );

    it('stays exact beyond the safe integer range of a float product', () => {
      const subtotal = Money.fromMinorUnits(1_000_000_000);

      expect(subtotal.scale(3650 * 10_000, 3650 * 10_000).minorUnits).toBe(
        1_000_000_000,
      );
    });
  });

  describe('arithmetic', () => {
    it('adds and subtracts', () => {
      expect(
        Money.fromMinorUnits(6000).plus(Money.fromMinorUnits(7500)).minorUnits,
      ).toBe(13_500);
      expect(
        Money.fromMinorUnits(13_500).minus(Money.fromMinorUnits(1030))
          .minorUnits,
      ).toBe(12_470);
    });

    it('rejects a subtraction that would go negative', () => {
      expect(() =>
        Money.fromMinorUnits(10).minus(Money.fromMinorUnits(11)),
      ).toThrow(InvalidMoneyAmountError);
    });

    it('multiplies by a whole number of transactions', () => {
      expect(Money.fromMinorUnits(25).times(300).minorUnits).toBe(7500);
      expect(Money.fromMinorUnits(25).times(0).minorUnits).toBe(0);
    });

    it.each([1.5, -1])('rejects %p as a multiplier', (factor) => {
      expect(() => Money.fromMinorUnits(25).times(factor)).toThrow(
        InvalidMoneyAmountError,
      );
    });
  });

  describe('fromMinorUnits', () => {
    it.each([1.5, -1])('rejects %p', (minorUnits) => {
      expect(() => Money.fromMinorUnits(minorUnits)).toThrow(
        InvalidMoneyAmountError,
      );
    });
  });

  describe('toDecimalString', () => {
    it.each([
      [0, '0.00'],
      [5, '0.05'],
      [50, '0.50'],
      [12_470, '124.70'],
    ])('renders %p pence as %p', (minorUnits, expected) => {
      expect(Money.fromMinorUnits(minorUnits).toDecimalString()).toBe(expected);
    });
  });

  it('is denominated in GBP', () => {
    expect(Money.fromMinorUnits(0).currency).toBe('GBP');
  });
});
