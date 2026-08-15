import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('reports the service as up with its uptime', () => {
    const response = new HealthController().check();

    expect(response.status).toBe('ok');
    expect(Number.isInteger(response.uptimeSeconds)).toBe(true);
    expect(response.uptimeSeconds).toBeGreaterThanOrEqual(0);
  });
});
