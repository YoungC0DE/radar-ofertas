import { readFileSync } from 'node:fs';
import path from 'node:path';

const DEFAULT_BRAND_NAME = 'Radar Ofertas';

export function getBrandName(): string {
  try {
    const raw = readFileSync(path.resolve('./data/brand.json'), 'utf8');
    const parsed = JSON.parse(raw) as { name?: string };
    return parsed.name?.trim() || DEFAULT_BRAND_NAME;
  } catch {
    return DEFAULT_BRAND_NAME;
  }
}
