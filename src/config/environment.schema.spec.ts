import { validateEnvironment } from './environment.schema';

describe('validateEnvironment', () => {
  it('accepts an empty environment and relies on defaults', () => {
    expect(() => validateEnvironment({})).not.toThrow();
  });

  it('coerces the string values the process environment supplies', () => {
    const validated = validateEnvironment({
      PORT: '3000',
      TRANSACTION_FEE_GBP: '0.30',
    });

    expect(validated.PORT).toBe(3000);
    expect(validated.TRANSACTION_FEE_GBP).toBe(0.3);
  });

  it('ignores variables it does not own', () => {
    expect(() => validateEnvironment({ HOME: '/root' })).not.toThrow();
  });

  it.each([
    { PORT: '0' },
    { PORT: '70000' },
    { PORT: 'not-a-number' },
    { TRANSACTION_FEE_GBP: '-1' },
    { TRANSACTION_FEE_GBP: '0.005' },
  ])('rejects %p', (env) => {
    expect(() => validateEnvironment(env)).toThrow(
      /Invalid environment configuration/,
    );
  });
});
