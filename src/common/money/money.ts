import { DomainError } from '../errors/domain-error';
import { DomainErrorCode } from '../errors/domain-error-code';
import { roundHalfUp } from '../math/integer-math';

export class InvalidMoneyAmountError extends DomainError {
  readonly code: DomainErrorCode = 'INVALID_MONEY_AMOUNT';
}

const MINOR_UNITS_PER_UNIT = 100;

/**
 * A non-negative GBP amount held as an integer number of pence. Every arithmetic
 * operation returns a new instance, so a bill's line items can never drift apart
 * from its total.
 */
export class Money {
  readonly currency = 'GBP' as const;

  private constructor(readonly minorUnits: number) {
    Object.freeze(this);
  }

  static fromMinorUnits(minorUnits: number): Money {
    if (!Number.isSafeInteger(minorUnits)) {
      throw new InvalidMoneyAmountError(
        `${minorUnits} is not a whole number of pence`,
      );
    }
    if (minorUnits < 0) {
      throw new InvalidMoneyAmountError(`${minorUnits} pence is negative`);
    }
    return new Money(minorUnits);
  }

  static fromGbp(amount: number): Money {
    if (!Number.isFinite(amount)) {
      throw new InvalidMoneyAmountError(`${amount} is not a finite GBP amount`);
    }
    if (amount < 0) {
      throw new InvalidMoneyAmountError(`${amount} is a negative GBP amount`);
    }
    const exact = amount * MINOR_UNITS_PER_UNIT;
    const minorUnits = Math.round(exact);
    // Check that the amount has at most two decimal places by comparing the
    // rounded value to the exact value. If they differ by more than a small
    // epsilon, it means there were more than two decimal places.
    if (Math.abs(minorUnits - exact) > 1e-6) {
      throw new InvalidMoneyAmountError(
        `${amount} has more than two decimal places`,
      );
    }
    return Money.fromMinorUnits(minorUnits);
  }

  plus(other: Money): Money {
    return Money.fromMinorUnits(this.minorUnits + other.minorUnits);
  }

  minus(other: Money): Money {
    return Money.fromMinorUnits(this.minorUnits - other.minorUnits);
  }

  times(factor: number): Money {
    if (!Number.isSafeInteger(factor) || factor < 0) {
      throw new InvalidMoneyAmountError(`${factor} is not a valid multiplier`);
    }
    return Money.fromMinorUnits(this.minorUnits * factor);
  }

  /** Multiplies by numerator/denominator, rounding half up to the nearest penny. */
  scale(numerator: number, denominator: number): Money {
    const scaled = BigInt(this.minorUnits) * BigInt(numerator);
    return Money.fromMinorUnits(
      Number(roundHalfUp(scaled, BigInt(denominator))),
    );
  }

  toDecimalString(): string {
    return (this.minorUnits / MINOR_UNITS_PER_UNIT).toFixed(2);
  }
}
