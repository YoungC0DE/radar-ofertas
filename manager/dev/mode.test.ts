import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isManagerHotReloadEnabled, shouldCacheManagerStaticAssets } from './mode.js';

describe('manager dev mode', () => {
  it('respeita MANAGER_HOT_RELOAD=true mesmo com NODE_ENV=production', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFlag = process.env.MANAGER_HOT_RELOAD;

    process.env.NODE_ENV = 'production';
    process.env.MANAGER_HOT_RELOAD = 'true';

    assert.equal(isManagerHotReloadEnabled(), true);
    assert.equal(shouldCacheManagerStaticAssets(), false);

    process.env.NODE_ENV = prevNodeEnv;
    process.env.MANAGER_HOT_RELOAD = prevFlag;
  });

  it('desliga hot reload com MANAGER_HOT_RELOAD=false', () => {
    const prevNodeEnv = process.env.NODE_ENV;
    const prevFlag = process.env.MANAGER_HOT_RELOAD;

    process.env.NODE_ENV = 'local';
    process.env.MANAGER_HOT_RELOAD = 'false';

    assert.equal(isManagerHotReloadEnabled(), false);
    assert.equal(shouldCacheManagerStaticAssets(), true);

    process.env.NODE_ENV = prevNodeEnv;
    process.env.MANAGER_HOT_RELOAD = prevFlag;
  });
});
