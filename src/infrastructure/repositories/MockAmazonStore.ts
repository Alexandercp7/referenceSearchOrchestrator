import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Store } from '../../domain/interfaces/stores/Store';

export class MockAmazonStore implements Store {
  readonly name = 'amazon';

  async search(query: string): Promise<RawProduct[]> {
    return [
      {
        title: `${query} — Premium edition`,
        priceText: '1299.00',
        currency: 'MXN',
        store: this.name,
        url: `https://amazon.com.mx/product/${encodeURIComponent(query)}-premium`,
        inStockText: 'in stock',
        deliveryText: '2',
        msiText: '12',
      },
      {
        title: `${query} — Standard`,
        priceText: '899.00',
        currency: 'MXN',
        store: this.name,
        url: `https://amazon.com.mx/product/${encodeURIComponent(query)}-standard`,
        inStockText: 'in stock',
        deliveryText: '3',
        msiText: '6',
      },
    ];
  }

  async fetchOne(url: string): Promise<RawProduct | null> {
    return {
      title: 'Mock Amazon product',
      priceText: '999.00',
      currency: 'MXN',
      store: this.name,
      url,
      inStockText: 'in stock',
      deliveryText: '2',
      msiText: '12',
    };
  }
}
