import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeInviteLink } from './channel-cache.js';

describe('normalizeInviteLink', () => {
  it('retorna vazio para input em branco', () => {
    assert.equal(normalizeInviteLink('   '), '');
  });

  it('monta URL completa a partir do código do canal', () => {
    assert.equal(
      normalizeInviteLink('AbCdEfGhIjKlMn'),
      'https://whatsapp.com/channel/AbCdEfGhIjKlMn',
    );
  });

  it('preserva URL já completa', () => {
    const url = 'https://whatsapp.com/channel/AbCdEfGhIjKlMn';
    assert.equal(normalizeInviteLink(url), url);
  });

  it('extrai código de URL parcial sem protocolo', () => {
    assert.equal(
      normalizeInviteLink('whatsapp.com/channel/XyZ123'),
      'https://whatsapp.com/channel/XyZ123',
    );
  });
});
