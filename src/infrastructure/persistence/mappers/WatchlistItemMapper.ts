import { WatchlistItem } from '../../../domain/entities/WatchlistItem';

export interface WatchlistItemRow {
  id: string;
  user_id: string;
  product_url: string;
  store: string;
  title: string;
  added_at: Date;
}

export class WatchlistItemMapper {
  static toDomain(row: WatchlistItemRow): WatchlistItem {
    return new WatchlistItem(
      row.id,
      row.user_id,
      row.product_url,
      row.store,
      row.title,
      row.added_at,
    );
  }

  static toRow(item: WatchlistItem): WatchlistItemRow {
    return {
      id: item.id,
      user_id: item.userId,
      product_url: item.productUrl,
      store: item.store,
      title: item.title,
      added_at: item.addedAt,
    };
  }
}
