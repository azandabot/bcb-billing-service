import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import {
  IdentifiedRequest,
  REQUEST_ID_HEADER,
  RequestLoggerInterceptor,
} from './request-logger.interceptor';

describe('RequestLoggerInterceptor', () => {
  let interceptor: RequestLoggerInterceptor;
  let request: Partial<IdentifiedRequest>;
  let response: {
    statusCode: number;
    setHeader: jest.Mock;
    on: jest.Mock;
    finish: () => void;
  };
  let logs: { level: string; message: string }[];

  function contextFor(): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ExecutionContext;
  }

  const handler = (): CallHandler =>
    ({ handle: () => of('ok') }) as CallHandler;

  beforeEach(() => {
    logs = [];
    request = {
      method: 'POST',
      originalUrl: '/accounts',
      url: '/accounts',
      headers: {},
    };
    let finishListener = (): void => undefined;
    response = {
      statusCode: 201,
      setHeader: jest.fn(),
      on: jest.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishListener = cb;
      }),
      finish: () => finishListener(),
    };
    interceptor = new RequestLoggerInterceptor();
    for (const level of ['log', 'warn', 'error'] as const) {
      jest
        .spyOn(Logger.prototype, level)
        .mockImplementation((...args: unknown[]) => {
          logs.push({ level, message: String(args[0]) });
        });
    }
  });

  afterEach(() => jest.restoreAllMocks());

  it('stamps a request id and returns it on the response header', () => {
    interceptor.intercept(contextFor(), handler()).subscribe();

    expect(request.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(response.setHeader).toHaveBeenCalledWith(
      REQUEST_ID_HEADER,
      request.requestId,
    );
  });

  it('reuses an id the caller already supplied', () => {
    request.headers = { [REQUEST_ID_HEADER]: 'upstream-123' };

    interceptor.intercept(contextFor(), handler()).subscribe();

    expect(request.requestId).toBe('upstream-123');
  });

  it.each([
    [
      'a newline, which would forge a log line',
      'ok\nLOG [HTTP] GET /admin 200',
    ],
    ['a carriage return, which would split a header', 'ok\r\nSet-Cookie: a=b'],
    ['a value longer than the limit', 'x'.repeat(129)],
    ['an empty value', ''],
    ['spaces', 'not a valid id'],
  ])('ignores a caller supplied id containing %s', (_case, supplied) => {
    request.headers = { [REQUEST_ID_HEADER]: supplied };

    interceptor.intercept(contextFor(), handler()).subscribe();

    expect(request.requestId).not.toBe(supplied);
    expect(request.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('writes one line per request, with method, path, status and duration', () => {
    interceptor.intercept(contextFor(), handler()).subscribe();
    response.finish();

    expect(logs).toHaveLength(1);
    expect(logs[0]?.level).toBe('log');
    expect(logs[0]?.message).toMatch(
      /^POST \/accounts 201 \d+\.\d+ms [0-9a-f-]{36}$/,
    );
  });

  it.each([
    [422, 'warn'],
    [404, 'warn'],
    [500, 'error'],
    [200, 'log'],
  ])('logs status %i at level %s', (statusCode, level) => {
    response.statusCode = statusCode;

    interceptor.intercept(contextFor(), handler()).subscribe();
    response.finish();

    expect(logs[0]?.level).toBe(level);
  });

  it('never logs the request body', () => {
    (request as { body?: unknown }).body = { monthlyFeeGbp: 30, secret: 'x' };

    interceptor.intercept(contextFor(), handler()).subscribe();
    response.finish();

    expect(logs[0]?.message).not.toContain('monthlyFeeGbp');
    expect(logs[0]?.message).not.toContain('secret');
  });

  it('does not swallow an error from the handler', (done) => {
    const failing = {
      handle: () => throwError(() => new Error('boom')),
    } as CallHandler;

    interceptor.intercept(contextFor(), failing).subscribe({
      error: (error: Error) => {
        expect(error.message).toBe('boom');
        done();
      },
    });
  });

  it('never lets a logging failure break the response', () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {
      throw new Error('log transport down');
    });

    interceptor.intercept(contextFor(), handler()).subscribe();

    expect(() => response.finish()).not.toThrow();
  });
});
