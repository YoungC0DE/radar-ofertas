import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, it } from 'node:test';
import { resolveSafePublicPath } from './static.js';

describe('resolveSafePublicPath', () => {
  const publicDir = path.resolve('/var/www/public');

  it('resolve asset dentro do diretório público', () => {
    assert.equal(
      resolveSafePublicPath('js/settings.js', publicDir),
      path.join(publicDir, 'js/settings.js'),
    );
  });

  it('bloqueia path traversal', () => {
    assert.equal(resolveSafePublicPath('../secret.env', publicDir), null);
    assert.equal(resolveSafePublicPath('..\\secret.env', publicDir), null);
  });
});
