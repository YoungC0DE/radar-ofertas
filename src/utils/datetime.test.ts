import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isValidTimezone } from './datetime.js';

describe('datetime', () => {
  it('accepts valid IANA timezones', () => {
    assert.equal(isValidTimezone('America/Sao_Paulo'), true);
    assert.equal(isValidTimezone('UTC'), true);
  });

  it('rejects invalid timezones', () => {
    assert.equal(isValidTimezone('Invalid/Zone'), false);
  });
});
