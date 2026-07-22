import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCouponsHtml, parseCouponsJson } from './coupon-parser.js';

describe('coupon-parser', () => {
  it('extrai cupons de JSON embutido', () => {
    const html = `
      <script>window.__PRELOADED_STATE__ = ${JSON.stringify({
        coupons: [
          {
            id: 'c1',
            title: 'Cupom Moda',
            discount_label: '20% OFF',
            code: 'MODA20',
            status: 'available',
            valid_until: '31/12/2026',
          },
        ],
      })};</script>
    `;

    const coupons = parseCouponsHtml(html);
    assert.equal(coupons.length, 1);
    assert.equal(coupons[0]?.title, 'Cupom Moda');
    assert.equal(coupons[0]?.code, 'MODA20');
    assert.equal(coupons[0]?.status, 'available');
  });

  it('extrai cupons de resposta JSON direta', () => {
    const coupons = parseCouponsJson({
      results: [
        { coupon_name: 'Frete grátis', benefit: 'R$ 30 OFF', coupon_code: 'FRETE30' },
      ],
    });

    assert.equal(coupons.length, 1);
    assert.equal(coupons[0]?.code, 'FRETE30');
  });
});
