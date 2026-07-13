import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { parseListingHtml, parseSalesRankText, parseSoldQuantity } from './parser.js';

const fixtureDir = dirname(fileURLToPath(import.meta.url));

describe('parser — sales rank', () => {
  it('extrai ranking do texto do produto', () => {
    assert.equal(parseSalesRankText('4º em Impressoras'), '4º em Impressoras');
    assert.equal(parseSalesRankText('MAIS VENDIDO 4º em Impressoras Novo'), '4º em Impressoras');
    assert.equal(parseSalesRankText('sem ranking'), null);
  });
});

describe('parser — sold quantity', () => {
  it('extrai +1000 vendidos do subtítulo', () => {
    assert.equal(parseSoldQuantity('Novo | +1000 vendidos'), 1000);
    assert.equal(parseSoldQuantity('+1000 vendidos'), 1000);
    assert.equal(parseSoldQuantity('1.234 vendidos'), 1234);
    assert.equal(parseSoldQuantity('mais de 5mil vendidos'), 5000);
  });

  it('ignora zero solto no meio do card', () => {
    assert.equal(parseSoldQuantity('0 vendidos'), null);
  });
});

describe('parser — ofertas poly-card', () => {
  it('parses current and original price from offer card', () => {
    const html = readFileSync(join(fixtureDir, 'fixtures/ofertas-card.html'), 'utf8');
    const items = parseListingHtml(html, 10);

    assert.equal(items.length, 1);
    assert.equal(items[0]?.id, 'MLB32396130');
    assert.equal(items[0]?.price, 597.91);
    assert.equal(items[0]?.originalPrice, 1075);
    assert.equal(items[0]?.title, 'Roçadeira Lateral A Gasolina 4 Em 1');
    assert.equal(items[0]?.salesRank, '4º em Roçadeiras');
  });
});
