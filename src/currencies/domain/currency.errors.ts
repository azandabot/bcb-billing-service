import { DomainError } from '../../common/errors/domain-error';
import { DomainErrorCode } from '../../common/errors/domain-error-code';

export class CurrencyAlreadyExistsError extends DomainError {
  readonly code: DomainErrorCode = 'CURRENCY_ALREADY_EXISTS';

  constructor(currencyCode: string) {
    super(`Currency '${currencyCode}' is already registered`);
  }
}

export class CurrencyNotRegisteredError extends DomainError {
  readonly code: DomainErrorCode = 'CURRENCY_NOT_REGISTERED';

  constructor(currencyCode: string) {
    super(`Currency '${currencyCode}' is not registered`);
  }
}
