import { Currency } from './currency';

export abstract class CurrencyRepository {
  abstract save(currency: Currency): Promise<void>;
  abstract findByCode(code: string): Promise<Currency | undefined>;
}
