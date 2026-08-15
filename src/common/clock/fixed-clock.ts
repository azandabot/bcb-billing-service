import { Clock } from './clock';

export class FixedClock extends Clock {
  constructor(private readonly instant: Date) {
    super();
  }

  now(): Date {
    return new Date(this.instant);
  }
}
