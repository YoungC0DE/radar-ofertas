import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { bumpDevBootId, getDevBootId } from './live-reload.js';

describe('dev live reload boot id', () => {
  it('muda após bumpDevBootId', () => {
    const before = getDevBootId();
    bumpDevBootId();
    const after = getDevBootId();
    assert.notEqual(before, after);
  });
});
