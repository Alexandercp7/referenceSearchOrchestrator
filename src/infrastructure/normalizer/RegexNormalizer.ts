import { randomUUID } from 'node:crypto';
import { Product } from '../../domain/entities/Product';
import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Normalizer } from '../../domain/interfaces/services/Normalizer';
import { Money } from '../../domain/valueObjects/Money';

const PRICE_RE = /\d+(?:\.\d{1,2})?/;
const STOCK_RE = /\b(?:en\s+stock|disponible|in\s+stock|available)\b/i;
const INT_RE = /\b(\d+)\b/;

export class RegexNormalizer implements Normalizer {
  normalize(raw: RawProduct): Product {
    return new Product(
      randomUUID(),
      raw.title.trim(),
      new Money(this.parsePrice(raw.priceText), raw.currency),
      raw.store,
      raw.url,
      this.parseInStock(raw.inStockText),
      this.parseFirstInt(raw.deliveryText, 7),
      this.parseFirstInt(raw.msiText, 0),
    );
  }

  private parsePrice(text: string): string {
    const cleaned = text.replace(/[$,\s]/g, '');
    return PRICE_RE.exec(cleaned)?.[0] ?? '0';
  }

  private parseInStock(text: string): boolean {
    return STOCK_RE.test(text);
  }

  private parseFirstInt(text: string, fallback: number): number {
    const match = INT_RE.exec(text);
    return match ? parseInt(match[1]!, 10) : fallback;
  }
}
