import { UtcDay } from '../../common/time/utc-day';

export const BASIS_POINTS_PER_PERCENT = 100;

/**
 * The promotional window is anchored to openedOn, the UTC day of creation, so a
 * discount is never a fraction of a day.
 */
export class Account {
  readonly openedOn: UtcDay;

  constructor(
    readonly accountId: string,
    readonly currencyCode: string,
    readonly transactionThreshold: number,
    readonly discountDays: number,
    readonly discountRateBasisPoints: number,
    readonly createdAt: Date,
  ) {
    this.openedOn = UtcDay.fromDate(createdAt);
    Object.freeze(this);
  }
}
