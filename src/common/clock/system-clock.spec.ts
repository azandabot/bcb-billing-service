import { SystemClock } from './system-clock';

describe('SystemClock', () => {
  it('reports the current instant', () => {
    const before = Date.now();

    const now = new SystemClock().now().getTime();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });
});
