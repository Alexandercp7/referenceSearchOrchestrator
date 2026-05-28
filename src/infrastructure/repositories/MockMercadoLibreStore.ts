import { RawProduct } from '../../domain/dtos/search/RawProduct';
import { Store } from '../../domain/interfaces/stores/Store';

export class MockMercadoLibreStore implements Store {
  readonly name = 'mercadolibre';

  async search(query: string): Promise<RawProduct[]> {
    return [
      {
        title: `${query} — Oferta ML`,
        priceText: '1099.00',
        currency: 'MXN',
        store: this.name,
        url: `https://mercadolibre.com.mx/p/${encodeURIComponent(query)}-oferta`,
        inStockText: 'disponible',
        deliveryText: '1',
        msiText: '18',
      },
    ];
  }

  async fetchOne(url: string): Promise<RawProduct | null> {
    return {
      title: 'Mock MercadoLibre product',
      priceText: '1050.00',
      currency: 'MXN',
      store: this.name,
      url,
      inStockText: 'disponible',
      deliveryText: '1',
      msiText: '18',
    };
  }
}
