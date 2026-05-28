import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
import puppeteer, { type Browser } from 'puppeteer-core';
import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Store } from '../../domain/interfaces/stores/Store';
import { normalizeText, parseDeliveryDays } from './textUtils';

const SEARCH_URL = 'https://listado.mercadolibre.com.mx/';

const CHROME_EXECUTABLE =
  process.env['CHROME_PATH'] ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

let sharedBrowser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (!sharedBrowser || !sharedBrowser.connected) {
    sharedBrowser = await puppeteer.launch({
      executablePath: CHROME_EXECUTABLE,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });
  }
  return sharedBrowser;
}

async function getRenderedHtml(url: string, waitForSelector: string): Promise<string> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    );
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
    await page.waitForSelector(waitForSelector, { timeout: 25_000 }).catch(() => {});
    return page.content();
  } finally {
    await page.close();
  }
}

export class MercadoLibreStore implements Store {
  readonly name = 'mercadolibre';

  async search(query: string): Promise<RawProduct[]> {
    const url = SEARCH_URL + query.replace(/\s+/g, '-');
    const html = await getRenderedHtml(url, 'div[class*="poly-card"]');
    return this.parseSearchResults(html);
  }

  async fetchOne(url: string): Promise<RawProduct | null> {
    const html = await getRenderedHtml(url, 'h1.ui-pdp-title');
    return this.parseProductPage(html, url);
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
    return (
      $(card)
        .find('div.poly-price__current span.andes-money-amount__fraction')
        .first()
        .text()
        .trim()
        .replace(/,/g, '') || '0'
    );
  }

  private extractMsiText($: cheerio.CheerioAPI, card: Element): string {
    const text = $(card).find('span.poly-price__installments').first().text().trim();
    if (!text) return '0';

    const normalized = normalizeText(text);
    const hasMsi =
      /\d+\s*(?:mes(?:es)?|x).*sin interes(?:es)?/.test(normalized) ||
      /sin interes(?:es)?.*\d+\s*(?:mes(?:es)?|x)/.test(normalized);
    if (!hasMsi) return '0';

    return /(\d+)\s*(?:mes(?:es)?|x)/.exec(normalized)?.[1] ?? '0';
  }

  private extractDeliveryText($: cheerio.CheerioAPI, card: Element): string {
    const text = $(card).find('div.poly-component__shipping').first().text().trim();
    return text ? parseDeliveryDays(normalizeText(text)) : '';
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

    const deliveryText = parseDeliveryDays(
      normalizeText($('p.ui-pdp-color--BLACK.ui-pdp-family--SEMIBOLD').first().text()),
    );

    const msiText =
      /(\d+)\s*(?:mes(?:es)?|x)/.exec(
        normalizeText($('p.ui-pdp-promotion-item__label').first().text()),
      )?.[1] ?? '0';

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
