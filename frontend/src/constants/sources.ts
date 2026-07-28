import type { SourceListingKind } from '../types/api.js';

export function listingKindLabel(kind: SourceListingKind): string {
  if (kind === 'offers') return 'Ofertas';
  if (kind === 'browse_node') return 'Recomendações';
  if (kind === 'search') return 'Busca';
  if (kind === 'product') return 'Produto';
  return 'Categoria';
}

export function parseEnvSourceIndex(id: string): number | null {
  if (!id.startsWith('env:')) return null;
  const index = Number.parseInt(id.slice(4), 10);
  return Number.isFinite(index) ? index : null;
}
