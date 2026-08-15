import { ApiProperty } from '@nestjs/swagger';
import { Money } from './money';

export class MoneyDto {
  @ApiProperty({ example: 6000, description: 'Canonical amount in pence' })
  minorUnits!: number;

  @ApiProperty({
    example: '60.00',
    description: 'Amount in GBP, two decimal places',
  })
  amount!: string;
}

export const toMoneyDto = (money: Money): MoneyDto => ({
  minorUnits: money.minorUnits,
  amount: money.toDecimalString(),
});
