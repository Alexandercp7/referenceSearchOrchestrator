import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Store } from '../../domain/interfaces/stores/Store';
import { HttpClient } from './http/HttpClient';
import { normalizeText, parseDeliveryDays } from './textUtils';

const SEARCH_URL = 'https://www.amazon.com.mx/s?k=';
const PRODUCT_URL_PREFIX = 'https://www.amazon.com.mx';
const DEFAULT_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'es-MX,es;q=0.9',
};

export class AmazonMxStore implements Store {
  readonly name = 'amazon';

  private readonly http: HttpClient;

  constructor(http?: HttpClient) {
    this.http = http ?? new HttpClient({ headers: DEFAULT_HEADERS });
  }

  async search(query: string): Promise<RawProduct[]> {
    const html = await this.http.getText(SEARCH_URL + encodeURIComponent(query));
    return this.parseSearchResults(html);
  }

  async fetchOne(url: string): Promise<RawProduct | null> {
    const html = await this.http.getText(url);
    return this.parseProductPage(html, url);
  }

  private parseSearchResults(html: string): RawProduct[] {
    const $ = cheerio.load(html);
    const products: RawProduct[] = [];

    $('div.puis-card-container').each((_, card) => {
      if (!this.isValidCard($, card as Element)) return;
      const product = this.parseCard($, card as Element);
      if (product) products.push(product);
    });

    return products;
  }

  private isValidCard($: cheerio.CheerioAPI, card: Element): boolean {
    return $(card).find('h2 span').length > 0 && $(card).find('span.a-offscreen').length > 0;
  }

  private parseCard($: cheerio.CheerioAPI, card: Element): RawProduct | null {
    const url = this.extractUrl($, card);
    if (!url) return null;

    return {
      title: this.extractTitle($, card),
      priceText: this.extractCashPrice($, card),
      currency: 'MXN',
      store: this.name,
      url,
      inStockText: 'in stock',
      deliveryText: this.extractDeliveryText($, card),
      msiText: this.extractMsiText($, card),
    };
  }

  private extractTitle($: cheerio.CheerioAPI, card: Element): string {
    return $(card).find('h2 span').first().text().trim() || 'Not specified';
  }

  private extractCashPrice($: cheerio.CheerioAPI, card: Element): string {
    const primary = $(card)
      .find('span.a-price:not(.a-text-price) span.a-offscreen')
      .first()
      .text();
    const fallback = $(card).find('span.a-offscreen').first().text();
    return (primary || fallback).trim().replace(/[$,]/g, '') || '0';
  }

  private extractDeliveryText($: cheerio.CheerioAPI, card: Element): string {
    const text = $(card).find('div.udm-primary-delivery-message').first().text();
    return text ? parseDeliveryDays(normalizeText(text)) : '';
  }

  private extractMsiText($: cheerio.CheerioAPI, card: Element): string {
    const text = $(card).find('span.a-size-base.a-color-secondary').first().text();
    if (!text) return '0';
    const normalized = normalizeText(text);
    if (!normalized.includes('sin interes')) return '0';
    return /(\d+)\s*meses/.exec(normalized)?.[1] ?? '0';
  }

  private extractUrl($: cheerio.CheerioAPI, card: Element): string | null {
    const href = $(card).find('a.a-link-normal').first().attr('href');
    if (!href) return null;
    return href.startsWith('/') ? PRODUCT_URL_PREFIX + href : href;
  }

  private parseProductPage(html: string, url: string): RawProduct | null {
    const $ = cheerio.load(html);

    const title = $('#productTitle span').first().text().trim();
    if (!title) return null;

    const priceText = $('#corePriceDisplay_desktop_feature_div span.a-offscreen')
      .first()
      .text()
      .trim()
      .replace(/[$,]/g, '') || '0';

    const deliveryText = parseDeliveryDays(
      normalizeText($('#mir-layout-DELIVERY_BLOCK .a-text-bold').first().text()),
    );

    const msiText =
      /(\d+)\s*meses/.exec(normalizeText($('#installmentCalculator_feature_div').first().text()))?.[1] ?? '0';

    return {
      title,
      priceText,
      currency: 'MXN',
      store: this.name,
      url,
      inStockText: 'in stock',
      deliveryText,
      msiText,
    };
  }
}
