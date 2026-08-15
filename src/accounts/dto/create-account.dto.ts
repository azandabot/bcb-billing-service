import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsString, Matches, Max, Min } from 'class-validator';
import { ToUpperCase } from '../../common/validation/to-upper-case.transform';
import { CURRENCY_CODE_PATTERN } from '../../currencies/dto/create-currency.dto';

export const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

export class CreateAccountDto {
  @ApiProperty({ example: 'acc-001' })
  @IsString()
  @Matches(ACCOUNT_ID_PATTERN, {
    message:
      'accountId must start with a letter or digit and contain only letters, digits, dots, hyphens or underscores',
  })
  accountId!: string;

  @ApiProperty({
    example: 'USDT',
    description: 'Must already be registered via POST /currencies',
  })
  @ToUpperCase()
  @IsString()
  @Matches(CURRENCY_CODE_PATTERN, {
    message: 'currency must be 2 to 10 alphanumeric characters',
  })
  currency!: string;

  @ApiProperty({
    example: 100,
    description: 'Free transactions per month before fees apply',
  })
  @IsInt()
  @Min(0)
  @Max(1_000_000)
  transactionThreshold!: number;

  @ApiProperty({
    example: 45,
    description: 'Length of the promotional window in days from creation',
  })
  @IsInt()
  @Min(0)
  @Max(3_650)
  discountDays!: number;

  @ApiProperty({
    example: 10,
    description: 'Promotional discount as a percentage, 0 to 100',
  })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountRate!: number;
}
