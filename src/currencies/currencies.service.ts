import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Money } from '../common/money/money';
import { AppConfig } from '../config/app-config.type';
import { Currency } from './domain/currency';
import {
  CurrencyAlreadyExistsError,
  CurrencyNotRegisteredError,
} from './domain/currency.errors';
import { CurrencyRepository } from './domain/currency.repository';
import { CreateCurrencyDto } from './dto/create-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(
    private readonly currencies: CurrencyRepository,
    private readonly config: ConfigService<AppConfig, true>,
  ) {}

  async register(dto: CreateCurrencyDto): Promise<Currency> {
    if (await this.currencies.findByCode(dto.currency)) {
      throw new CurrencyAlreadyExistsError(dto.currency);
    }
    const transactionFeeGbp =
      dto.transactionFeeGbp ??
      this.config.getOrThrow('transactionFeeGbp', { infer: true });
    const currency = new Currency(
      dto.currency,
      Money.fromGbp(dto.monthlyFeeGbp),
      Money.fromGbp(transactionFeeGbp),
    );
    await this.currencies.save(currency);
    return currency;
  }

  async getRegistered(code: string): Promise<Currency> {
    const currency = await this.currencies.findByCode(code);
    if (!currency) {
      throw new CurrencyNotRegisteredError(code);
    }
    return currency;
  }
}
