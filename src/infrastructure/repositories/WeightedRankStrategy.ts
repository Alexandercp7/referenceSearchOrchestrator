import { Product } from '../../domain/entities/Product';
import { RankedProduct } from '../../domain/dtos/search/RankedProduct';
import { RankStrategy } from '../../domain/interfaces/services/RankStrategy';
import { SearchWeights } from '../../domain/valueObjects/SearchWeights';

const MAX_DELIVERY_DAYS = 14;
const MAX_MSI = 24;

export class WeightedRankStrategy implements RankStrategy {
  rank(products: Product[], weights: SearchWeights): RankedProduct[] {
    if (products.length === 0) return [];

    const priceMin = Math.min(...products.map((p) => p.price.amount.toNumber()));
    const priceMax = Math.max(...products.map((p) => p.price.amount.toNumber()));
    const priceRange = priceMax - priceMin || 1;

    return products
      .map((product) => {
        const priceScore = 1 - (product.price.amount.toNumber() - priceMin) / priceRange;
        const stockScore = product.inStock ? 1 : 0;
        const deliveryScore = Math.max(0, 1 - product.deliveryDays / MAX_DELIVERY_DAYS);
        const msiScore = Math.min(product.msi, MAX_MSI) / MAX_MSI;

        const score =
          priceScore * weights.price +
          stockScore * weights.stock +
          deliveryScore * weights.delivery +
          msiScore * weights.msi;

        return new RankedProduct(
          product.id,
          product.title,
          product.store,
          product.url,
          product.price,
          Math.max(0, Math.min(1, score)),
        );
      })
      .sort((a, b) => b.score - a.score);
  }
}
