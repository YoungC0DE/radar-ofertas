import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatCouponMessage } from './coupon-message.js';
import { renderCouponTemplate, sampleCouponTemplateValues } from './coupon-template.js';
import type { MlCoupon } from '../mercado-livre/types.js';

describe('coupon-message', () => {
  it('formata mensagem com código e validade', async () => {
    const coupon: MlCoupon = {
      id: '1',
      title: '#PROMOAGRADARKLAB',
      description: '',
      discountLabel: 'R$ 20 OFF',
      code: '#PROMOAGRADARKLAB',
      category: 'PRODUCT_DISCOUNT',
      minPurchase: null,
      expiresAt: '2026-08-01T02:59:59',
      storeName: 'Darklab',
      storeUrl: 'https://listado.mercadolivre.com.br/loja/darklab',
      status: 'available',
      rawStatus: null,
    };

    const message = await formatCouponMessage(coupon);
    assert.match(message, /R\$ 20 OFF/);
    assert.match(message, /#PROMOAGRADARKLAB/);
    assert.match(message, /Válido até: 01\/08\/2026/);
    assert.doesNotMatch(message, /02:59/);
    assert.match(message, /Darklab/);
  });
});

describe('coupon-template', () => {
  it('renderiza placeholders do cupom', () => {
    const values = sampleCouponTemplateValues();
    const message = renderCouponTemplate(
      '🎟️ {{brand}}\n🏷️ {{discount}}\n🔖 {{code}}',
      values,
    );
    assert.match(message, new RegExp(values.brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    assert.match(message, /R\$ 20 OFF/);
    assert.match(message, /#PROMOAGRADARKLAB/);
  });
});
