import type { IncomingMessage } from 'node:http';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stubEnv } from '../../src/test/env-stub.js';
import { isAuthorized, normalizePath, parseFormUrlEncoded } from './request.js';

describe('normalizePath', () => {
  it('remove barra final exceto na raiz', () => {
    assert.equal(normalizePath('/manager/'), '/manager');
    assert.equal(normalizePath('/'), '/');
  });
});

describe('parseFormUrlEncoded', () => {
  it('decodifica campos do body', () => {
    assert.deepEqual(parseFormUrlEncoded('name=Radar&limit=10'), {
      name: 'Radar',
      limit: '10',
    });
  });
});

describe('isAuthorized', () => {
  it('permite tudo quando MANAGER_TOKEN não está definido', () => {
    stubEnv({ MANAGER_TOKEN: undefined });
    const url = new URL('http://localhost/manager');
    assert.equal(isAuthorized({ headers: {} } as IncomingMessage, url), true);
  });

  it('aceita token via query string', () => {
    stubEnv({ MANAGER_TOKEN: 'secret' });
    const url = new URL('http://localhost/manager?token=secret');
    assert.equal(isAuthorized({ headers: {} } as IncomingMessage, url), true);
  });

  it('aceita Bearer token', () => {
    stubEnv({ MANAGER_TOKEN: 'secret' });
    const url = new URL('http://localhost/manager');
    assert.equal(
      isAuthorized({ headers: { authorization: 'Bearer secret' } } as IncomingMessage, url),
      true,
    );
  });

  it('rejeita token inválido', () => {
    stubEnv({ MANAGER_TOKEN: 'secret' });
    const url = new URL('http://localhost/manager');
    assert.equal(isAuthorized({ headers: {} } as IncomingMessage, url), false);
  });
});
