import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Store } from '../../domain/interfaces/stores/Store';
import { normalizeText, parseDeliveryDays } from './textUtils';

const SEARCH_URL = 'https://listado.mercadolibre.com.mx/';
const HEADERS = { 'User-Agent': 'Mozilla/5.0' };

type FetchFn = (url: string, init?: RequestInit) => Promise<Response>;

export class MercadoLibreScraperStore implements Store {
  readonly name = 'mercadolibre';

  constructor(private readonly fetchFn: FetchFn = fetch) {}

  async search(query: string): Promise<RawProduct[]> {
    const url = SEARCH_URL + query.replace(/\s+/g, '-');
    const html = await this.fetchHtml(url);
    return this.parseSearchResults(html);
  }

  async fetchOne(url: string): Promise<RawProduct | null> {
    const html = await this.fetchHtml(url);
    return this.parseProductPage(html, url);
  }

  private async fetchHtml(url: string): Promise<string> {
    const response = await this.fetchFn(url, { headers: HEADERS });
    if (!response.ok) {
      throw new Error(`MercadoLibre request failed: ${response.status} ${url}`);
    }
    return response.text();
  }

  private parseSearchResults(html: string): RawProduct[] {
    const $ = cheerio.load(html);
    const products: RawProduct[] = [];

    $('div.poly-card__content').each((_, card) => {
      if (!this.isValidCard($, card as Element)) return;
      const product = this.parseCard($, card as Element);
      if (product) products.push(product);
    });

    return products;
  }

  private isValidCard($: cheerio.CheerioAPI, card: Element): boolean {
    return (
      $(card).find('a.poly-component__title').length > 0 &&
      $(card).find('span.andes-money-amount__fraction').length > 0
    );
  }

  private parseCard($: cheerio.CheerioAPI, card: Element): RawProduct | null {
    const titleTag = $(card).find('a.poly-component__title').first();
    const url = titleTag.attr('href')?.trim();
    if (!url) return null;

    return {
      title: titleTag.text().trim(),
      priceText: this.extractCashPrice($, card),
      currency: 'MXN',
      store: this.name,
      url,
      inStockText: 'disponible',
      deliveryText: this.extractDeliveryText($, card),
      msiText: this.extractMsiText($, card),
    };
  }

  private extractCashPrice($: cheerio.CheerioAPI, card: Element): string {
    const fraction = $(card)
      .find('div.poly-price__current span.andes-money-amount__fraction')
      .first()
      .text()
      .trim();
    return fraction.replace(/,/g, '') || '0';
  }

  private extractMsiText($: cheerio.CheerioAPI, card: Element): string {
    const text = $(card).find('span.poly-price__installments').first().text().trim();
    if (!text) return '0';

    const normalized = normalizeText(text);
    const hasMsi =
      /\d+\s*(?:mes(?:es)?|x).*sin interes(?:es)?/.test(normalized) ||
      /sin interes(?:es)?.*\d+\s*(?:mes(?:es)?|x)/.test(normalized);
    if (!hasMsi) return '0';

    const match = /(\d+)\s*(?:mes(?:es)?|x)/.exec(normalized);
    return match?.[1] ?? '0';
  }

  private extractDeliveryText($: cheerio.CheerioAPI, card: Element): string {
    const text = $(card).find('div.poly-component__shipping').first().text().trim();
    if (!text) return '';
    return parseDeliveryDays(normalizeText(text));
  }

  private parseProductPage(html: string, url: string): RawProduct | null {
    const $ = cheerio.load(html);

    const title = $('h1.ui-pdp-title').first().text().trim();
    if (!title) return null;

    const priceText =
      $('div.ui-pdp-price__main-container span.andes-money-amount__fraction')
        .first()
        .text()
        .replace(/,/g, '')
        .trim() || '0';

    const deliveryRaw = $('p.ui-pdp-color--BLACK.ui-pdp-family--SEMIBOLD').first().text();
    const deliveryText = parseDeliveryDays(normalizeText(deliveryRaw));

    const msiRaw = $('p.ui-pdp-promotion-item__label').first().text();
    const msiMatch = /(\d+)\s*(?:mes(?:es)?|x)/.exec(normalizeText(msiRaw));
    const msiText = msiMatch?.[1] ?? '0';

    return {
      title,
      priceText,
      currency: 'MXN',
      store: this.name,
      url,
      inStockText: 'disponible',
      deliveryText,
      msiText,
    };
  }
}
