import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, httpServer } from './helpers/create-test-app';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health reports the service as up', async () => {
    const response = await request(httpServer(app)).get('/health').expect(200);

    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.uptimeSeconds).toBe('number');
  });

  it('returns the standard error envelope for an unknown route', async () => {
    const response = await request(httpServer(app))
      .get('/does-not-exist')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'NOT_FOUND',
      path: '/does-not-exist',
    });
  });
});
