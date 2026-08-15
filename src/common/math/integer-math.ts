/**
 * Integer arithmetic helpers. Billing figures are never derived from floating point
 * division: a value a few ULPs above an integer changes the result of ceil(), which
 * would hand out an extra free transaction.
 */

export function ceilDiv(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    throw new RangeError('denominator must be greater than zero');
  }
  if (!Number.isSafeInteger(numerator) || !Number.isSafeInteger(denominator)) {
    throw new RangeError('ceilDiv operands must be safe integers');
  }
  const remainder = numerator % denominator;
  return (numerator - remainder) / denominator + (remainder > 0 ? 1 : 0);
}

/**
 * Divides and rounds half away from zero. All billing amounts are non-negative, so
 * this is the "round .5 up" a reviewer verifies with a calculator. BigInt division
 * truncates toward zero, which equals floor for non-negatives, making
 * (2n + d) / 2d exactly half-up.
 */
export function roundHalfUp(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError('denominator must be greater than zero');
  }
  if (numerator < 0n) {
    throw new RangeError('roundHalfUp expects a non-negative numerator');
  }
  return (2n * numerator + denominator) / (2n * denominator);
}
