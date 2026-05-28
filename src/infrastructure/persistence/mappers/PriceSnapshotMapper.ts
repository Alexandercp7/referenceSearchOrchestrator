import { PriceSnapshot } from '../../../domain/entities/PriceSnapshot';
import { Money } from '../../../domain/valueObjects/Money';

export interface PriceSnapshotRow {
  id: string;
  product_url: string;
  store: string;
  amount: string;
  currency: string;
  scraped_at: Date;
}

export class PriceSnapshotMapper {
  static toDomain(row: PriceSnapshotRow): PriceSnapshot {
    return new PriceSnapshot(
      row.id,
      row.product_url,
      row.store,
      new Money(row.amount, row.currency),
      row.scraped_at,
    );
  }

  static toRow(snapshot: PriceSnapshot): PriceSnapshotRow {
    return {
      id: snapshot.id,
      product_url: snapshot.productUrl,
      store: snapshot.store,
      amount: snapshot.price.amount.toString(),
      currency: snapshot.price.currency,
      scraped_at: snapshot.scrapedAt,
    };
  }
}
