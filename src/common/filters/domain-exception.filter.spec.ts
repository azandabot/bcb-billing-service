import {
  ArgumentsHost,
  BadRequestException,
  HttpStatus,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AccountNotFoundError } from '../../accounts/domain/account.errors';
import { InvalidBillingPeriodError } from '../../billing/domain/billing-period';
import {
  CurrencyAlreadyExistsError,
  CurrencyNotRegisteredError,
} from '../../currencies/domain/currency.errors';
import { DomainError } from '../errors/domain-error';
import {
  DOMAIN_ERROR_CODES,
  DomainErrorCode,
} from '../errors/domain-error-code';
import { InvalidMoneyAmountError } from '../money/money';
import { DomainExceptionFilter } from './domain-exception.filter';
import { ErrorResponseDto } from './error-response.dto';

class StubDomainError extends DomainError {
  constructor(readonly code: DomainErrorCode) {
    super(`stub for ${code}`);
  }
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();
  let status: jest.Mock;
  let json: jest.Mock;
  let host: ArgumentsHost;
  let logError: jest.SpyInstance;
  let headersSent: boolean;

  beforeEach(() => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    headersSent = false;
    host = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/accounts', method: 'POST' }),
        getResponse: () => ({
          status,
          get headersSent() {
            return headersSent;
          },
        }),
      }),
    } as unknown as ArgumentsHost;
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function capture(exception: unknown, requestId?: string): ErrorResponseDto {
    const scoped = {
      switchToHttp: () => ({
        getRequest: () => ({ url: '/accounts', method: 'POST', requestId }),
        getResponse: () => ({
          status,
          get headersSent() {
            return headersSent;
          },
        }),
      }),
    } as unknown as ArgumentsHost;
    filter.catch(exception, scoped);
    return json.mock.calls[0][0] as ErrorResponseDto;
  }

  it.each([
    [
      new AccountNotFoundError('acc-001'),
      HttpStatus.NOT_FOUND,
      'ACCOUNT_NOT_FOUND',
    ],
    [
      new CurrencyAlreadyExistsError('GBP'),
      HttpStatus.CONFLICT,
      'CURRENCY_ALREADY_EXISTS',
    ],
    [
      new CurrencyNotRegisteredError('USDT'),
      HttpStatus.UNPROCESSABLE_ENTITY,
      'CURRENCY_NOT_REGISTERED',
    ],
    [
      new InvalidBillingPeriodError('bad period'),
      HttpStatus.BAD_REQUEST,
      'INVALID_BILLING_PERIOD',
    ],
    [
      new InvalidMoneyAmountError('bad amount'),
      HttpStatus.BAD_REQUEST,
      'INVALID_MONEY_AMOUNT',
    ],
  ])(
    'maps %p to status %p with code %p',
    (exception, expectedStatus, expectedCode) => {
      const body = capture(exception);

      expect(status).toHaveBeenCalledWith(expectedStatus);
      expect(body).toMatchObject({
        statusCode: expectedStatus,
        code: expectedCode,
        message: (exception as Error).message,
        path: '/accounts',
      });
      expect(body.details).toBeUndefined();
      expect(Date.parse(body.timestamp)).not.toBeNaN();
    },
  );

  it.each(DOMAIN_ERROR_CODES)('maps the %s code to a client error', (code) => {
    const body = capture(new StubDomainError(code));

    expect(body.code).toBe(code);
    expect(body.statusCode).toBeGreaterThanOrEqual(HttpStatus.BAD_REQUEST);
    expect(body.statusCode).toBeLessThan(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('carries the request id into the envelope when one is present', () => {
    const body = capture(new AccountNotFoundError('acc-001'), 'req-abc');

    expect(body.requestId).toBe('req-abc');
  });

  it('omits requestId entirely when the request was never stamped', () => {
    const body = capture(new AccountNotFoundError('acc-001'));

    expect(body.requestId).toBeUndefined();
  });

  it('does not try to answer twice when the response has already been sent', () => {
    headersSent = true;

    filter.catch(new AccountNotFoundError('acc-001'), host);

    expect(status).not.toHaveBeenCalled();
    expect(json).not.toHaveBeenCalled();
  });

  it('survives a failure while writing the error response', () => {
    status.mockImplementation(() => {
      throw new Error('socket closed');
    });

    expect(() =>
      filter.catch(new AccountNotFoundError('acc-001'), host),
    ).not.toThrow();
  });

  it('reports validation failures with the failed constraints', () => {
    const body = capture(
      new BadRequestException({
        statusCode: 400,
        message: ['transactionCount must be an integer number'],
        error: 'Bad Request',
      }),
    );

    expect(body).toMatchObject({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'VALIDATION_FAILED',
      message: 'Request validation failed',
      details: ['transactionCount must be an integer number'],
    });
  });

  it('passes through a framework exception that carries no constraints', () => {
    const body = capture(new NotFoundException('Cannot POST /unknown'));

    expect(body).toMatchObject({
      statusCode: HttpStatus.NOT_FOUND,
      code: 'NOT_FOUND',
      message: 'Cannot POST /unknown',
    });
    expect(body.details).toBeUndefined();
  });

  it('reports an express body error with its own status rather than a 500', () => {
    const body = capture(
      Object.assign(new Error('request entity too large'), {
        status: 413,
        statusCode: 413,
      }),
    );

    expect(body).toMatchObject({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'request entity too large',
    });
  });

  it('falls back to statusCode when status is absent', () => {
    const body = capture(
      Object.assign(new Error('bad json'), { statusCode: 400 }),
    );

    expect(body.statusCode).toBe(400);
  });

  it('labels an unnamed client status as a validation failure', () => {
    const body = capture(Object.assign(new Error('odd'), { status: 499 }));

    expect(body).toMatchObject({ statusCode: 499, code: 'VALIDATION_FAILED' });
  });

  it.each([500, 502, 'nonsense', undefined])(
    'treats a status of %p as an internal error',
    (status) => {
      const body = capture(Object.assign(new Error('boom'), { status }));

      expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(body.code).toBe('INTERNAL_ERROR');
    },
  );

  it('hides the detail of an unexpected error', () => {
    const body = capture(new Error('connection string leaked here'));

    expect(body).toMatchObject({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    });
    expect(JSON.stringify(body)).not.toContain('connection string');
  });

  it('logs the stack of an unexpected error', () => {
    capture(new Error('boom'));

    expect(logError).toHaveBeenCalled();
  });

  it('handles a thrown value that is not an error', () => {
    const body = capture('something odd');

    expect(body.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
