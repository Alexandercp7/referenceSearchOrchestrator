import { InvalidDateRange } from '../exceptions/DateRangeErrors';

export { InvalidDateRange };

export class DateRange {
  readonly from: Date;
  readonly to: Date;

  constructor(from: Date, to: Date) {
    if (from.getTime() > to.getTime()) {
      throw new InvalidDateRange(`'from' must be <= 'to'`);
    }
    this.from = from;
    this.to = to;
  }

  static lastDays(days: number, to: Date = new Date()): DateRange {
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    return new DateRange(from, to);
  }

  contains(date: Date): boolean {
    const t = date.getTime();
    return t >= this.from.getTime() && t <= this.to.getTime();
  }
}
