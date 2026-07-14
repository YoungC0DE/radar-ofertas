import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_PLACEHOLDER_VISIBILITY,
  formatOfferMessageFromTemplate,
  formatTopSoldLabel,
  renderMessageTemplate,
  sampleTemplateValues,
} from './message-template.js';
import type { OfferRecord } from './types.js';

const sampleOffer: OfferRecord = {
  id: 'test',
  mercadoLivreId: 'MLB123',
  title: 'Mouse Gamer RGB',
  price: 99.9,
  oldPrice: 149.9,
  discount: 33,
  image: null,
  affiliateLink: 'https://mercadolivre.com/sec/abc',
  rating: 4.5,
  soldQuantity: 200,
  salesRank: '4º em Mouses Gamer',
  score: 80,
  sentAt: null,
  createdAt: new Date('2026-01-01'),
};

describe('message-template', () => {
  it('substitui todos os placeholders', () => {
    const template =
      '{{store}}\n{{name}}\n{{price}}\n{{avalia}}\n{{qty_sold}}\n{{top_sold}}\n{{product_link}}';
    const result = formatOfferMessageFromTemplate(template, sampleOffer);

    assert.match(result, /Mouse Gamer RGB/);
    assert.match(result, /R\$\s*99,90/);
    assert.match(result, /4\.5 ⭐/);
    assert.match(result, /200 vendidos/);
    assert.match(result, /4º em Mouses Gamer/);
    assert.match(result, /https:\/\/mercadolivre\.com\/sec\/abc/);
  });

  it('top_sold fica vazio sem ranking', () => {
    const noRank = { ...sampleOffer, salesRank: null };
    const result = formatOfferMessageFromTemplate('{{top_sold}}\n{{qty_sold}}', noRank);
    assert.doesNotMatch(result, /º em/);
    assert.match(result, /200 vendidos/);
  });

  it('formata ranking com frete e parcelamento', () => {
    const formatted = formatTopSoldLabel(
      '419º em outros meiosChegará grátis amanhãDisponível em 12',
    );
    assert.equal(
      formatted,
      '419º em outros meios - Chegará grátis amanhã - Disponível em 12x',
    );
  });

  it('preserva linhas em branco no template', () => {
    const template = 'Linha 1\n\nLinha 2';
    const result = renderMessageTemplate(template, sampleTemplateValues());
    assert.equal(result, 'Linha 1\n\nLinha 2');
  });

  it('omite placeholders desativados', () => {
    const template = '{{name}}\n⭐ {{avalia}}\n{{price}}';
    const visibility = { ...DEFAULT_PLACEHOLDER_VISIBILITY, avalia: false };
    const result = renderMessageTemplate(template, sampleTemplateValues(), visibility);

    assert.match(result, /Fone Bluetooth/);
    assert.doesNotMatch(result, /⭐/);
    assert.doesNotMatch(result, /4\.8/);
  });

  it('mantém placeholders desconhecidos no texto', () => {
    const result = renderMessageTemplate('Olá {{foo}}', sampleTemplateValues());
    assert.equal(result, 'Olá {{foo}}');
  });

  it('usa template padrão com estrutura esperada', () => {
    const result = formatOfferMessageFromTemplate(DEFAULT_MESSAGE_TEMPLATE, sampleOffer);
    assert.match(result, /Mouse Gamer RGB/);
    assert.match(result, /Compre aqui/);
  });
});
