import { Money } from '../../common/money/money';
import { UtcDay } from '../../common/time/utc-day';
import { BillingPeriod } from './billing-period';
import { calculateBill } from './billing-policy';
import { MonthFraction } from './month-fraction';
import { Bill, BillingRules } from './billing.types';

const DEFAULT_RULES = {
  monthlyFeeGbp: 30,
  transactionFeeGbp: 0.3,
  transactionThreshold: 100,
  discountDays: 0,
  discountRatePercent: 0,
  openedOn: '2026-01-01',
};

type Scenario = Partial<typeof DEFAULT_RULES> & {
  start: string;
  end: string;
  transactionCount: number;
};

function bill(scenario: Scenario): Bill {
  const merged = { ...DEFAULT_RULES, ...scenario };
  const rules: BillingRules = {
    monthlyFee: Money.fromGbp(merged.monthlyFeeGbp),
    transactionFee: Money.fromGbp(merged.transactionFeeGbp),
    transactionThreshold: merged.transactionThreshold,
    discountRateBasisPoints: merged.discountRatePercent * 100,
    discountDays: merged.discountDays,
    accountOpenedOn: UtcDay.fromIsoString(merged.openedOn),
  };
  return calculateBill(rules, {
    period: BillingPeriod.create(
      UtcDay.fromIsoString(merged.start),
      UtcDay.fromIsoString(merged.end),
    ),
    transactionCount: merged.transactionCount,
  });
}

describe('calculateBill', () => {
  describe('base fee and transaction fees', () => {
    const cases: Array<
      Scenario & {
        name: string;
        monthsScaled: number;
        baseFee: number;
        effectiveThreshold: number;
        chargeable: number;
        transactionFees: number;
        total: number;
      }
    > = [
      {
        name: 'a whole calendar month is exactly one month',
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 50,
        monthsScaled: 377_580,
        baseFee: 3000,
        effectiveThreshold: 100,
        chargeable: 0,
        transactionFees: 0,
        total: 3000,
      },
      {
        name: 'charges only the transactions above the threshold',
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 250,
        monthsScaled: 377_580,
        baseFee: 3000,
        effectiveThreshold: 100,
        chargeable: 150,
        transactionFees: 4500,
        total: 7500,
      },
      {
        name: 'bills 2026-01-01 to 2026-01-31 as GBP 29.03, being 30 of January 31 days',
        start: '2026-01-01',
        end: '2026-01-31',
        transactionCount: 50,
        monthsScaled: 365_400,
        baseFee: 2903,
        effectiveThreshold: 97,
        chargeable: 0,
        transactionFees: 0,
        total: 2903,
      },
      {
        name: 'bills a 29 day February as a full month',
        start: '2024-02-01',
        end: '2024-03-01',
        transactionCount: 50,
        monthsScaled: 377_580,
        baseFee: 3000,
        effectiveThreshold: 100,
        chargeable: 0,
        transactionFees: 0,
        total: 3000,
      },
      {
        name: 'prorates half a month',
        start: '2025-02-01',
        end: '2025-02-15',
        transactionCount: 60,
        monthsScaled: 188_790,
        baseFee: 1500,
        effectiveThreshold: 50,
        chargeable: 10,
        transactionFees: 300,
        total: 1800,
      },
      {
        name: 'sums two part months across a boundary',
        start: '2026-01-15',
        end: '2026-02-15',
        transactionCount: 200,
        monthsScaled: 395_850,
        baseFee: 3145,
        effectiveThreshold: 105,
        chargeable: 95,
        transactionFees: 2850,
        total: 5995,
      },
      {
        name: 'sums two part months across a shorter boundary',
        start: '2026-02-15',
        end: '2026-03-15',
        transactionCount: 100,
        monthsScaled: 359_310,
        baseFee: 2855,
        effectiveThreshold: 96,
        chargeable: 4,
        transactionFees: 120,
        total: 2975,
      },
      {
        name: 'bills a single day',
        start: '2026-01-01',
        end: '2026-01-02',
        transactionCount: 10,
        monthsScaled: 12_180,
        baseFee: 97,
        effectiveThreshold: 4,
        chargeable: 6,
        transactionFees: 180,
        total: 277,
      },
      {
        name: 'bills three years without drift',
        start: '2024-01-01',
        end: '2027-01-01',
        transactionCount: 0,
        monthsScaled: 13_592_880,
        baseFee: 108_000,
        effectiveThreshold: 3600,
        chargeable: 0,
        transactionFees: 0,
        total: 108_000,
      },
      {
        name: 'charges every transaction when the threshold is zero',
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 5,
        transactionThreshold: 0,
        monthsScaled: 377_580,
        baseFee: 3000,
        effectiveThreshold: 0,
        chargeable: 5,
        transactionFees: 150,
        total: 3150,
      },
      {
        name: 'supports a zero monthly fee',
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 250,
        monthlyFeeGbp: 0,
        monthsScaled: 377_580,
        baseFee: 0,
        effectiveThreshold: 100,
        chargeable: 150,
        transactionFees: 4500,
        total: 4500,
      },
    ];

    it.each(cases)(
      '$name',
      ({
        monthsScaled,
        baseFee,
        effectiveThreshold,
        chargeable,
        transactionFees,
        total,
        ...scenario
      }) => {
        const result = bill(scenario);

        expect(result.explanation.months.scaled).toBe(monthsScaled);
        expect(result.breakdown.baseFee.minorUnits).toBe(baseFee);
        expect(result.explanation.effectiveThreshold).toBe(effectiveThreshold);
        expect(result.explanation.chargeableTransactions).toBe(chargeable);
        expect(result.breakdown.transactionFees.minorUnits).toBe(
          transactionFees,
        );
        expect(result.breakdown.total.minorUnits).toBe(total);
      },
    );

    it.each(cases)(
      'reconciles the breakdown to the total for: $name',
      (scenario) => {
        const { baseFee, transactionFees, subtotal, discount, total } =
          bill(scenario).breakdown;

        expect(subtotal.minorUnits).toBe(
          baseFee.minorUnits + transactionFees.minorUnits,
        );
        expect(total.minorUnits).toBe(
          subtotal.minorUnits - discount.minorUnits,
        );
      },
    );
  });

  describe('promotional discount', () => {
    const cases = [
      {
        name: 'discounts the whole period when the promotion covers it',
        openedOn: '2026-01-01',
        discountDays: 31,
        discountRatePercent: 10,
        discountedDays: 31,
        discount: 750,
        total: 6750,
      },
      {
        name: 'prorates when the promotion expires mid period',
        openedOn: '2026-01-01',
        discountDays: 10,
        discountRatePercent: 10,
        discountedDays: 10,
        discount: 242,
        total: 7258,
      },
      {
        name: 'prorates when the promotion started before the period',
        openedOn: '2025-12-20',
        discountDays: 30,
        discountRatePercent: 10,
        discountedDays: 18,
        discount: 435,
        total: 7065,
      },
      {
        name: 'reduces the bill to zero at 100 percent',
        openedOn: '2026-01-01',
        discountDays: 31,
        discountRatePercent: 100,
        discountedDays: 31,
        discount: 7500,
        total: 0,
      },
      {
        name: 'applies nothing when the promotion lasts zero days',
        openedOn: '2026-01-01',
        discountDays: 0,
        discountRatePercent: 10,
        discountedDays: 0,
        discount: 0,
        total: 7500,
      },
      {
        name: 'applies nothing when the account is opened after the period',
        openedOn: '2026-06-01',
        discountDays: 30,
        discountRatePercent: 50,
        discountedDays: 0,
        discount: 0,
        total: 7500,
      },
      {
        name: 'applies nothing when the promotion expired before the period',
        openedOn: '2025-01-01',
        discountDays: 30,
        discountRatePercent: 50,
        discountedDays: 0,
        discount: 0,
        total: 7500,
      },
    ];

    it.each(cases)(
      '$name',
      ({
        openedOn,
        discountDays,
        discountRatePercent,
        discountedDays,
        discount,
        total,
      }) => {
        const result = bill({
          start: '2026-01-01',
          end: '2026-02-01',
          transactionCount: 250,
          openedOn,
          discountDays,
          discountRatePercent,
        });

        expect(result.breakdown.subtotal.minorUnits).toBe(7500);
        expect(result.explanation.discountedDays).toBe(discountedDays);
        expect(result.breakdown.discount.minorUnits).toBe(discount);
        expect(result.breakdown.total.minorUnits).toBe(total);
      },
    );

    it('never discounts more than the subtotal', () => {
      const result = bill({
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 250,
        discountDays: 3650,
        discountRatePercent: 100,
      });

      expect(result.breakdown.discount.minorUnits).toBe(
        result.breakdown.subtotal.minorUnits,
      );
      expect(result.breakdown.total.minorUnits).toBe(0);
    });

    it('applies the discount on the same basis as calendar days within one month', () => {
      const result = bill({
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 250,
        discountDays: 10,
        discountRatePercent: 10,
      });
      const { subtotal, discount } = result.breakdown;
      const calendarBasis = Math.round(
        (subtotal.minorUnits * 10 * 10) / (31 * 100),
      );

      expect(discount.minorUnits).toBe(calendarBasis);
    });
  });

  describe('exactness', () => {
    it('does not grant an extra free transaction from floating point drift', () => {
      // 31/31 + 3/30 evaluates to 1.1, but 100 * 1.1 is 110.00000000000001,
      // so Math.ceil on the float basis would return 111.
      const result = bill({
        start: '2024-03-01',
        end: '2024-04-04',
        transactionCount: 200,
      });

      expect(Math.ceil(100 * result.explanation.months.toNumber())).toBe(111);
      expect(result.explanation.effectiveThreshold).toBe(110);
    });

    it('sums to exactly twelve months over twelve consecutive periods', () => {
      const boundaries = Array.from({ length: 13 }, (_, index) =>
        UtcDay.fromParts(2026, index, 15),
      );
      const total = boundaries.slice(0, 12).reduce((sum, start, index) => {
        const end = boundaries.at(index + 1);
        if (!end) throw new Error('missing boundary');
        return sum + BillingPeriod.create(start, end).months().scaled;
      }, 0);

      expect(total).toBe(12 * MonthFraction.scale);
    });

    it('bills a 29 day February identically to a 31 day January', () => {
      const february = bill({
        start: '2024-02-01',
        end: '2024-03-01',
        transactionCount: 0,
      });
      const january = bill({
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 0,
      });

      expect(february.breakdown.total.minorUnits).toBe(
        january.breakdown.total.minorUnits,
      );
    });

    it('charges less for a longer period when the prorated allowance rounds up', () => {
      // Documented consequence of prorating an allowance per request: a longer
      // period can round the free allowance up past the extra base fee.
      const shorter = bill({
        start: '2026-01-01',
        end: '2026-02-01',
        transactionCount: 200,
        monthlyFeeGbp: 0.01,
        transactionFeeGbp: 1,
      });
      const longer = bill({
        start: '2026-01-01',
        end: '2026-02-02',
        transactionCount: 200,
        monthlyFeeGbp: 0.01,
        transactionFeeGbp: 1,
      });

      expect(shorter.breakdown.total.minorUnits).toBe(10_001);
      expect(longer.breakdown.total.minorUnits).toBe(9601);
    });
  });

  it('produces the worked example from the README', () => {
    const result = bill({
      monthlyFeeGbp: 30,
      transactionFeeGbp: 0.25,
      transactionThreshold: 100,
      discountDays: 45,
      discountRatePercent: 10,
      openedOn: '2026-01-01',
      start: '2026-01-01',
      end: '2026-03-01',
      transactionCount: 500,
    });

    expect(result.explanation).toMatchObject({
      periodDays: 59,
      transactionCount: 500,
      effectiveThreshold: 200,
      chargeableTransactions: 300,
      discountedDays: 45,
    });
    expect(result.explanation.months.scaled).toBe(2 * MonthFraction.scale);
    expect(result.breakdown.baseFee.minorUnits).toBe(6000);
    expect(result.breakdown.transactionFees.minorUnits).toBe(7500);
    expect(result.breakdown.subtotal.minorUnits).toBe(13_500);
    expect(result.breakdown.discount.minorUnits).toBe(1030);
    expect(result.breakdown.total.minorUnits).toBe(12_470);
  });
});
