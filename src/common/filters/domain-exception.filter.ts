import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '../errors/domain-error';
import { IdentifiedRequest } from '../logging/request-logger.interceptor';
import { DomainErrorCode } from '../errors/domain-error-code';
import { ErrorResponseDto } from './error-response.dto';

/**
 * The single place that knows how a business rule violation becomes an HTTP status.
 * `satisfies` keeps the map exhaustive: adding a DomainErrorCode without a status
 * fails the build.
 */
const DOMAIN_ERROR_STATUS = {
  ACCOUNT_NOT_FOUND: HttpStatus.NOT_FOUND,
  ACCOUNT_ALREADY_EXISTS: HttpStatus.CONFLICT,
  CURRENCY_ALREADY_EXISTS: HttpStatus.CONFLICT,
  CURRENCY_NOT_REGISTERED: HttpStatus.UNPROCESSABLE_ENTITY,
  INVALID_BILLING_PERIOD: HttpStatus.BAD_REQUEST,
  INVALID_MONEY_AMOUNT: HttpStatus.BAD_REQUEST,
  INVALID_DATE: HttpStatus.BAD_REQUEST,
} as const satisfies Record<DomainErrorCode, HttpStatus>;

const CLIENT_ERROR_THRESHOLD: number = HttpStatus.BAD_REQUEST;
const SERVER_ERROR_THRESHOLD: number = HttpStatus.INTERNAL_SERVER_ERROR;
const VALIDATION_FAILED = 'VALIDATION_FAILED';
const INTERNAL_ERROR = 'INTERNAL_ERROR';

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<IdentifiedRequest>();
    const response = context.getResponse<Response>();
    const body = this.toErrorResponse(
      exception,
      request.url,
      request.requestId,
    );

    if (body.statusCode >= SERVER_ERROR_THRESHOLD) {
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url} ${request.requestId ?? ''}`.trim(),
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    // An error thrown after the response has begun cannot be answered with a
    // second one. Writing anyway would throw inside the error handler itself.
    if (response.headersSent) {
      this.logger.warn(
        `Response already sent for ${request.method} ${request.url}, could not deliver ${body.code}`,
      );
      return;
    }

    try {
      response.status(body.statusCode).json(body);
    } catch (writeError: unknown) {
      this.logger.error(
        `Failed to write the error response for ${request.method} ${request.url}`,
        writeError instanceof Error ? writeError.stack : String(writeError),
      );
    }
  }

  private toErrorResponse(
    exception: unknown,
    path: string,
    requestId?: string,
  ): ErrorResponseDto {
    const timestamp = new Date().toISOString();

    if (exception instanceof DomainError) {
      return {
        statusCode: DOMAIN_ERROR_STATUS[exception.code],
        code: exception.code,
        message: exception.message,
        path,
        timestamp,
        ...(requestId ? { requestId } : {}),
      };
    }

    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const details = extractValidationDetails(exception.getResponse());
      return {
        statusCode,
        code: details
          ? VALIDATION_FAILED
          : (HttpStatus[statusCode] ?? INTERNAL_ERROR),
        message: details ? 'Request validation failed' : exception.message,
        ...(details ? { details } : {}),
        path,
        timestamp,
        ...(requestId ? { requestId } : {}),
      };
    }

    // Express rejects malformed and oversized bodies with an http-errors object
    // rather than a Nest HttpException, so those would otherwise surface as 500s.
    const clientError = toClientErrorStatus(exception);
    if (clientError) {
      return {
        statusCode: clientError,
        code: HttpStatus[clientError] ?? VALIDATION_FAILED,
        message: (exception as Error).message,
        path,
        timestamp,
        ...(requestId ? { requestId } : {}),
      };
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: INTERNAL_ERROR,
      message: 'An unexpected error occurred',
      path,
      timestamp,
      ...(requestId ? { requestId } : {}),
    };
  }
}

function toClientErrorStatus(exception: unknown): number | undefined {
  const status = (exception as { status?: unknown; statusCode?: unknown })
    ?.status;
  const fallback = (exception as { statusCode?: unknown })?.statusCode;
  const code = typeof status === 'number' ? status : fallback;
  return typeof code === 'number' &&
    code >= CLIENT_ERROR_THRESHOLD &&
    code < SERVER_ERROR_THRESHOLD
    ? code
    : undefined;
}

/** ValidationPipe reports every failed constraint as a string array. */
function extractValidationDetails(
  response: string | object,
): string[] | undefined {
  if (typeof response !== 'object') {
    return undefined;
  }
  const message: unknown = (response as { message?: unknown }).message;
  return Array.isArray(message) &&
    message.every((entry) => typeof entry === 'string')
    ? message
    : undefined;
}
