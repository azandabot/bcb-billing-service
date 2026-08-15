import { DomainError } from '../../common/errors/domain-error';
import { DomainErrorCode } from '../../common/errors/domain-error-code';

export class AccountNotFoundError extends DomainError {
  readonly code: DomainErrorCode = 'ACCOUNT_NOT_FOUND';

  constructor(accountId: string) {
    super(`Account '${accountId}' was not found`);
  }
}

export class AccountAlreadyExistsError extends DomainError {
  readonly code: DomainErrorCode = 'ACCOUNT_ALREADY_EXISTS';

  constructor(accountId: string) {
    super(`Account '${accountId}' already exists`);
  }
}
