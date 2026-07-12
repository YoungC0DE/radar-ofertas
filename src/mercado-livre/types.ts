export interface ScrapedItem {
  id: string;
  title: string;
  price: number;
  originalPrice: number | null;
  thumbnail: string | null;
  permalink: string;
  soldQuantity: number | null;
  rating: number | null;
}

export interface AffiliateLinkResult {
  url: string;
  shortUrl: string | null;
  source: 'http' | 'browser' | 'fallback';
}

export interface StorageState {
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  origins?: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}
