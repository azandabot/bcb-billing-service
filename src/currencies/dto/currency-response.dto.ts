import { ApiProperty } from '@nestjs/swagger';
import { MoneyDto, toMoneyDto } from '../../common/money/money.dto';
import { Currency } from '../domain/currency';

export class CurrencyResponseDto {
  @ApiProperty({ example: 'USDT' })
  currency!: string;

  @ApiProperty({ type: MoneyDto })
  monthlyFee!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  transactionFee!: MoneyDto;
}

export const toCurrencyResponse = (
  currency: Currency,
): CurrencyResponseDto => ({
  currency: currency.code,
  monthlyFee: toMoneyDto(currency.monthlyFee),
  transactionFee: toMoneyDto(currency.transactionFee),
});
