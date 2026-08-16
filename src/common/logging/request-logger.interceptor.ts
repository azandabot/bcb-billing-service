import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Observable } from 'rxjs';

export const REQUEST_ID_HEADER = 'x-request-id';

/** An express request once this interceptor has stamped it. */
export interface IdentifiedRequest extends Request {
  requestId?: string;
}

const SERVER_ERROR = 500;
const CLIENT_ERROR = 400;
const NS_PER_MS = 1_000_000;

/**
 * One log line per request, written when the response is actually finished so the
 * status and duration are the real ones rather than the ones we hoped for.
 *
 * Request bodies are never logged. They carry fees, thresholds and account
 * identifiers, and none of that belongs in a log aggregator.
 */
@Injectable()
export class RequestLoggerInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const request = http.getRequest<IdentifiedRequest>();
    const response = http.getResponse<Response>();

    const requestId = incomingRequestId(request) ?? randomUUID();
    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);

    const startedAt = process.hrtime.bigint();
    const { method, originalUrl } = request;

    response.on('finish', () => {
      // Logging must never be the reason a request fails, so it cannot throw.
      try {
        const durationMs =
          Number(process.hrtime.bigint() - startedAt) / NS_PER_MS;
        const line = `${method} ${originalUrl} ${response.statusCode} ${durationMs.toFixed(1)}ms ${requestId}`;
        if (response.statusCode >= SERVER_ERROR) {
          this.logger.error(line);
        } else if (response.statusCode >= CLIENT_ERROR) {
          this.logger.warn(line);
        } else {
          this.logger.log(line);
        }
      } catch {
        // deliberately swallowed: the response has already been sent
      }
    });

    return next.handle();
  }
}

/**
 * Reuse an upstream id when a gateway or client already supplied one, but only if
 * it is safe. The value is echoed into a response header and written into a log
 * line, so an unchecked one would let a caller forge log entries or inject a
 * header. Anything outside this shape is ignored and a fresh id is minted.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

function incomingRequestId(request: Request): string | undefined {
  const header = request.headers[REQUEST_ID_HEADER];
  const value = Array.isArray(header) ? header[0] : header;
  return typeof value === 'string' && SAFE_REQUEST_ID.test(value)
    ? value
    : undefined;
}
