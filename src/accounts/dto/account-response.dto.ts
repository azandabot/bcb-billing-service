import { ApiProperty } from '@nestjs/swagger';
import { Account, BASIS_POINTS_PER_PERCENT } from '../domain/account';

export class AccountResponseDto {
  @ApiProperty({ example: 'acc-001' })
  accountId!: string;

  @ApiProperty({ example: 'USDT' })
  currency!: string;

  @ApiProperty({ example: 100 })
  transactionThreshold!: number;

  @ApiProperty({ example: 45 })
  discountDays!: number;

  @ApiProperty({
    example: 10,
    description: 'Percentage, so 10 means ten percent',
  })
  discountRatePercent!: number;

  @ApiProperty({
    example: '2026-01-01T00:00:00.000Z',
    description: 'Anchor for the promotional window',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2026-01-01',
    description: 'UTC day the promotional window starts',
  })
  openedOn!: string;
}

export const toAccountResponse = (account: Account): AccountResponseDto => ({
  accountId: account.accountId,
  currency: account.currencyCode,
  transactionThreshold: account.transactionThreshold,
  discountDays: account.discountDays,
  discountRatePercent:
    account.discountRateBasisPoints / BASIS_POINTS_PER_PERCENT,
  createdAt: account.createdAt.toISOString(),
  openedOn: account.openedOn.toIsoDate(),
});
