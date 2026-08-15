import { DomainErrorCode } from './domain-error-code';

/**
 * Base class for business rule violations. The domain never imports HttpStatus;
 * DomainExceptionFilter is the only place that knows how a code maps onto HTTP.
 */
export abstract class DomainError extends Error {
  abstract readonly code: DomainErrorCode;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
