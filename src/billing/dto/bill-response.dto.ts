import { ApiProperty } from '@nestjs/swagger';
import { BASIS_POINTS_PER_PERCENT } from '../../accounts/domain/account';
import { MoneyDto, toMoneyDto } from '../../common/money/money.dto';
import { AccountBill } from '../account-bill.type';

const MONTHS_DECIMAL_PLACES = 6;

export class BillingPeriodDto {
  @ApiProperty({ example: '2026-01-01' })
  start!: string;

  @ApiProperty({ example: '2026-03-01', description: 'Exclusive' })
  end!: string;

  @ApiProperty({ example: 59 })
  days!: number;

  @ApiProperty({
    example: 2,
    description: 'Informational; billed amounts derive from exact integers',
  })
  months!: number;
}

export class BillBreakdownDto {
  @ApiProperty({ type: MoneyDto })
  baseFee!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  transactionFees!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  subtotal!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  discount!: MoneyDto;
}

export class BillDetailsDto {
  @ApiProperty({ type: MoneyDto })
  monthlyFee!: MoneyDto;

  @ApiProperty({ type: MoneyDto })
  transactionFee!: MoneyDto;

  @ApiProperty({ example: 500 })
  transactionCount!: number;

  @ApiProperty({ example: 100 })
  transactionThreshold!: number;

  @ApiProperty({
    example: 200,
    description: 'transactionThreshold prorated over the period',
  })
  effectiveThreshold!: number;

  @ApiProperty({ example: 300 })
  chargeableTransactions!: number;

  @ApiProperty({ example: 10 })
  discountRatePercent!: number;

  @ApiProperty({ example: 45 })
  discountDays!: number;

  @ApiProperty({
    example: 45,
    description: 'Days the promotion and the billing period share',
  })
  discountedDays!: number;
}

export class BillResponseDto {
  @ApiProperty({ example: 'acc-001' })
  accountId!: string;

  @ApiProperty({ example: 'USDT' })
  accountCurrency!: string;

  @ApiProperty({
    example: 'GBP',
    description: 'Bills are always denominated in GBP',
  })
  billingCurrency!: string;

  @ApiProperty({ type: BillingPeriodDto })
  billingPeriod!: BillingPeriodDto;

  @ApiProperty({ type: BillBreakdownDto })
  breakdown!: BillBreakdownDto;

  @ApiProperty({
    type: MoneyDto,
    description: 'baseFee + transactionFees - discount',
  })
  total!: MoneyDto;

  @ApiProperty({ type: BillDetailsDto })
  details!: BillDetailsDto;
}

export const toBillResponse = ({
  account,
  currency,
  bill,
}: AccountBill): BillResponseDto => {
  const { breakdown, explanation, period } = bill;
  return {
    accountId: account.accountId,
    accountCurrency: account.currencyCode,
    billingCurrency: breakdown.total.currency,
    billingPeriod: {
      start: period.start.toIsoDate(),
      end: period.end.toIsoDate(),
      days: explanation.periodDays,
      months: Number(
        explanation.months.toNumber().toFixed(MONTHS_DECIMAL_PLACES),
      ),
    },
    breakdown: {
      baseFee: toMoneyDto(breakdown.baseFee),
      transactionFees: toMoneyDto(breakdown.transactionFees),
      subtotal: toMoneyDto(breakdown.subtotal),
      discount: toMoneyDto(breakdown.discount),
    },
    total: toMoneyDto(breakdown.total),
    details: {
      monthlyFee: toMoneyDto(currency.monthlyFee),
      transactionFee: toMoneyDto(currency.transactionFee),
      transactionCount: explanation.transactionCount,
      transactionThreshold: account.transactionThreshold,
      effectiveThreshold: explanation.effectiveThreshold,
      chargeableTransactions: explanation.chargeableTransactions,
      discountRatePercent:
        account.discountRateBasisPoints / BASIS_POINTS_PER_PERCENT,
      discountDays: account.discountDays,
      discountedDays: explanation.discountedDays,
    },
  };
};
