import { Injectable } from '@nestjs/common';
import { Currency } from '../domain/currency';
import { CurrencyRepository } from '../domain/currency.repository';

@Injectable()
export class InMemoryCurrencyRepository extends CurrencyRepository {
  private readonly currencies = new Map<string, Currency>();

  save(currency: Currency): Promise<void> {
    this.currencies.set(currency.code, currency);
    return Promise.resolve();
  }

  findByCode(code: string): Promise<Currency | undefined> {
    return Promise.resolve(this.currencies.get(code));
  }
}
