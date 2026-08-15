import { plainToInstance } from 'class-transformer';
import { ToUpperCase } from './to-upper-case.transform';

class Code {
  @ToUpperCase()
  currency!: string;
}
describe('ToUpperCase', () => {
  it.each([
    ['usdt', 'USDT'],
    ['  usdt  ', 'USDT'],
    ['USDT', 'USDT'],
  ])('normalises %p to %p', (input, expected) => {
    expect(plainToInstance(Code, { currency: input }).currency).toBe(expected);
  });

  it('leaves a non string untouched for the type validator to reject', () => {
    expect(plainToInstance(Code, { currency: 42 }).currency).toBe(42);
  });
});
