import { randomUUID } from 'node:crypto';
import { Product } from '../../domain/entities/Product';
import { Normalizer } from '../../domain/interfaces/services/Normalizer';
import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Money } from '../../domain/valueObjects/Money';

export class BasicNormalizer implements Normalizer {
  normalize(raw: RawProduct): Product {
    return new Product(
      randomUUID(),
      raw.title.trim(),
      new Money(raw.priceText, raw.currency),
      raw.store,
      raw.url,
      this.parseInStock(raw.inStockText),
      this.parseInt(raw.deliveryText, 7),
      this.parseInt(raw.msiText, 0),
    );
  }

  private parseInStock(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('stock') || lower.includes('disponible');
  }

  private parseInt(text: string, fallback: number): number {
    const value = parseInt(text, 10);
    return Number.isNaN(value) ? fallback : value;
  }
}
