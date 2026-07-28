export const SCORE_CATEGORY_KEYS = ['discount', 'rating', 'soldQuantity', 'price'] as const;

export type ScoreCategoryKey = (typeof SCORE_CATEGORY_KEYS)[number];

export const SCORE_CATEGORY_LABELS: Record<ScoreCategoryKey, string> = {
  discount: 'Desconto',
  rating: 'Avaliação',
  soldQuantity: 'Quantidade de vendas',
  price: 'Preço',
};

export function scoreComparatorLabel(key: ScoreCategoryKey): string {
  return key === 'price' ? '≤' : '≥';
}

export function scoreUnitLabel(key: ScoreCategoryKey): string {
  if (key === 'discount') return '%';
  if (key === 'rating') return 'estrelas';
  if (key === 'soldQuantity') return 'un.';
  return 'R$';
}

export function scoreInputStep(key: ScoreCategoryKey): string {
  return key === 'rating' ? '0.1' : '1';
}

export function scoreInputMax(key: ScoreCategoryKey): number | undefined {
  if (key === 'discount') return 100;
  if (key === 'rating') return 5;
  return undefined;
}
