export interface RawOffer {
  mercadoLivreId: string;
  title: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  image: string | null;
  rating: number | null;
  soldQuantity: number | null;
  salesRank: string | null;
  permalink: string;
}

export interface ScoredOffer extends RawOffer {
  score: number;
  affiliateLink: string;
}

export interface OfferRecord {
  id: string;
  mercadoLivreId: string;
  title: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  image: string | null;
  permalink: string | null;
  affiliateLink: string | null;
  rating: number | null;
  soldQuantity: number | null;
  salesRank: string | null;
  score: number;
  sentAt: Date | null;
  createdAt: Date;
}

export interface CreateOfferInput {
  mercadoLivreId: string;
  title: string;
  price: number;
  oldPrice: number | null;
  discount: number | null;
  image: string | null;
  permalink: string | null;
  affiliateLink: string | null;
  rating: number | null;
  soldQuantity: number | null;
  salesRank: string | null;
  score: number;
}
