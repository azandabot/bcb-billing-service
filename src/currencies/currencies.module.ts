import { Module } from '@nestjs/common';
import { CurrenciesController } from './currencies.controller';
import { CurrenciesService } from './currencies.service';
import { CurrencyRepository } from './domain/currency.repository';
import { InMemoryCurrencyRepository } from './infrastructure/in-memory-currency.repository';

@Module({
  controllers: [CurrenciesController],
  providers: [
    CurrenciesService,
    { provide: CurrencyRepository, useClass: InMemoryCurrencyRepository },
  ],
  exports: [CurrenciesService],
})
export class CurrenciesModule {}
