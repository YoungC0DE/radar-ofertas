import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { env } from './env.js';
import {
  buildMlCategoryRows,
  getActiveMlCategories,
  setEnvFlagsCacheForTest,
  setMlSourcesCacheForTest,
} from './ml-sources-config.js';

describe('ml-sources-config', () => {
  it('combines env categories with enabled custom sources', () => {
    const customUrl =
      'https://www.mercadolivre.com.br/ofertas?container_id=MLB779362-1&promotion_type=lightning';
    setMlSourcesCacheForTest([
      {
        id: 'custom-1',
        label: 'Relâmpago',
        url: customUrl,
        enabled: true,
      },
      {
        id: 'custom-2',
        label: 'Desativada',
        url: 'https://www.mercadolivre.com.br/ofertas?container_id=MLB773331-2',
        enabled: false,
      },
    ]);

    const active = getActiveMlCategories();
    assert.ok(active.some((category) => category.includes('MLB')));
    assert.ok(active.includes(customUrl));
    assert.equal(
      active.includes('https://www.mercadolivre.com.br/ofertas?container_id=MLB773331-2'),
      false,
    );

    setMlSourcesCacheForTest(null);
  });

  it('buildMlCategoryRows marks env rows as enabled by default', () => {
    setMlSourcesCacheForTest([]);
    const rows = buildMlCategoryRows();
    const envRow = rows.find((row) => row.fromEnv);
    assert.ok(envRow);
    assert.equal(envRow.enabled, true);
    assert.equal(envRow.fromEnv, true);
    setMlSourcesCacheForTest(null);
  });

  it('respects env source flags when disabled', () => {
    setMlSourcesCacheForTest([]);
    const disabled = Object.fromEntries(env.ML_CATEGORIES.map((category) => [category, false]));
    setEnvFlagsCacheForTest(disabled);

    const active = getActiveMlCategories();
    for (const category of env.ML_CATEGORIES) {
      assert.equal(active.includes(category), false);
    }

    const envRow = buildMlCategoryRows().find((row) => row.fromEnv);
    assert.ok(envRow);
    assert.equal(envRow.enabled, false);

    setEnvFlagsCacheForTest(null);
    setMlSourcesCacheForTest(null);
  });
});
