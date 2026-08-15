import { ceilDiv, roundHalfUp } from './integer-math';

describe('ceilDiv', () => {
  it.each([
    [0, 10, 0],
    [10, 10, 1],
    [11, 10, 2],
    [19, 10, 2],
    [20, 10, 2],
    [41_533_800, 377_580, 110],
  ])('divides %p by %p to %p', (numerator, denominator, expected) => {
    expect(ceilDiv(numerator, denominator)).toBe(expected);
  });

  it.each([0, -1])('rejects a denominator of %p', (denominator) => {
    expect(() => ceilDiv(10, denominator)).toThrow(RangeError);
  });

  it('rejects a non integer operand', () => {
    expect(() => ceilDiv(1.5, 10)).toThrow(RangeError);
  });
});

describe('roundHalfUp', () => {
  it.each([
    [1n, 2n, 1n],
    [3n, 2n, 2n],
    [5n, 2n, 3n],
    [1n, 4n, 0n],
    [3n, 4n, 1n],
    [0n, 7n, 0n],
  ])('rounds %p/%p to %p', (numerator, denominator, expected) => {
    expect(roundHalfUp(numerator, denominator)).toBe(expected);
  });

  it('rejects a non positive denominator', () => {
    expect(() => roundHalfUp(1n, 0n)).toThrow(RangeError);
  });

  it('rejects a negative numerator', () => {
    expect(() => roundHalfUp(-1n, 2n)).toThrow(RangeError);
  });
});
