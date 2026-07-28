export const MESSAGE_PLACEHOLDERS = [
  { key: 'brand', label: 'Nome do seu canal', example: 'Radar Ofertas' },
  { key: 'name', label: 'Nome do produto', example: 'Fone Bluetooth XYZ' },
  { key: 'price', label: 'Preço formatado', example: 'R$ 89,90 (de R$ 129,90)' },
  { key: 'discount', label: 'Desconto anunciado', example: '41% OFF' },
  { key: 'avalia', label: 'Avaliação', example: '4.8 ⭐' },
  { key: 'qty_sold', label: 'Quantidade vendida', example: '1.234 vendidos' },
  { key: 'best_seller', label: 'Selo de mais vendido', example: '🏆 MAIS VENDIDO' },
  { key: 'top_sold', label: 'Ranking de vendas', example: '4º em Impressoras' },
  { key: 'store', label: 'Vendedor no Mercado Livre', example: 'Mega Mamute ✅ Loja oficial' },
  {
    key: 'product_link',
    label: 'Link de compra (afiliado)',
    example: 'https://mercadolivre.com/sec/abc123',
  },
] as const;

export const COUPON_PLACEHOLDERS = [
  { key: 'brand', label: 'Nome do seu canal', example: 'Radar Ofertas' },
  { key: 'discount', label: 'Desconto do cupom', example: 'R$ 20 OFF' },
  { key: 'store', label: 'Nome da loja', example: 'Lucas-home' },
  { key: 'title', label: 'Loja ou título do cupom', example: 'Darklab' },
  { key: 'code', label: 'Código promocional', example: '#PROMOAGRADARKLAB' },
  { key: 'expires', label: 'Data de validade', example: '01/08/2026' },
  { key: 'store_link', label: 'Link Ver produtos', example: 'https://mercadolivre.com/sec/...' },
  { key: 'category', label: 'Categoria do cupom', example: 'PRODUCT_DISCOUNT' },
  { key: 'min_purchase', label: 'Compra mínima', example: 'R$ 100' },
] as const;

export type PlaceholderMeta = {
  key: string;
  label: string;
  example: string;
};
