import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsISO8601, Max, Min } from 'class-validator';
import {
  IsAfterDay,
  IsUnambiguousInstant,
  MaxPeriodDays,
} from '../../common/validation/date-validators';
import { MAX_BILLING_PERIOD_DAYS } from '../domain/billing-period';

export class CreateBillDto {
  @ApiProperty({
    example: '2026-01-01',
    description: 'Inclusive start of the billing period, as a UTC day',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @IsUnambiguousInstant()
  billingPeriodStart!: string;

  @ApiProperty({
    example: '2026-03-01',
    description: 'Exclusive end of the billing period, as a UTC day',
  })
  @IsISO8601({ strict: true, strictSeparator: true })
  @IsUnambiguousInstant()
  @IsAfterDay('billingPeriodStart')
  @MaxPeriodDays('billingPeriodStart', MAX_BILLING_PERIOD_DAYS)
  billingPeriodEnd!: string;

  @ApiProperty({
    example: 500,
    description: 'Transactions settled during the period',
  })
  @IsInt()
  @Min(0)
  @Max(10_000_000)
  transactionCount!: number;
}
