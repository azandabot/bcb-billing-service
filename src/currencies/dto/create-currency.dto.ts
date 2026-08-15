import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { ToUpperCase } from '../../common/validation/to-upper-case.transform';

/**
 * Currency codes are not validated against ISO 4217: the endpoint exists precisely
 * so callers can define their own set, and BCB settles crypto tickers such as USDT
 * and USDC alongside fiat.
 */
export const CURRENCY_CODE_PATTERN = /^[A-Z0-9]{2,10}$/;

export class CreateCurrencyDto {
  @ApiProperty({
    example: 'USDT',
    description: 'Currency code, normalised to upper case',
  })
  @ToUpperCase()
  @IsString()
  @Matches(CURRENCY_CODE_PATTERN, {
    message: 'currency must be 2 to 10 alphanumeric characters',
  })
  currency!: string;

  @ApiProperty({ example: 30, description: 'Monthly base fee in GBP' })
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000_000)
  monthlyFeeGbp!: number;

  @ApiPropertyOptional({
    example: 0.25,
    description:
      'Fee in GBP per transaction above the threshold. Defaults to TRANSACTION_FEE_GBP.',
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false, maxDecimalPlaces: 2 })
  @Min(0)
  @Max(1_000)
  transactionFeeGbp?: number;
}
