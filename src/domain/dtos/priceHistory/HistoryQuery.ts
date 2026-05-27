import { DateRange } from '../../valueObjects/DateRange';

export interface HistoryQuery {
  productUrl: string;
  range: DateRange;
}
