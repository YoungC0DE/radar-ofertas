import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isAffiliateSubTabId,
  isSettingsTabId,
  resolveAffiliateSubTab,
  resolveSettingsActiveTab,
} from './tab-state.js';

describe('resolveSettingsActiveTab', () => {
  it('maps save types to the correct main tab', () => {
    assert.equal(resolveSettingsActiveTab('brand'), 'geral');
    assert.equal(resolveSettingsActiveTab('score'), 'geral');
    assert.equal(resolveSettingsActiveTab('couponsUrl'), 'afiliados');
    assert.equal(resolveSettingsActiveTab('amazonAffiliate'), 'afiliados');
    assert.equal(resolveSettingsActiveTab(null), 'geral');
  });
});

describe('resolveAffiliateSubTab', () => {
  it('opens the marketplace tab related to the last save', () => {
    assert.equal(resolveAffiliateSubTab('amazonAffiliate'), 'amazon');
    assert.equal(resolveAffiliateSubTab('couponsUrl'), 'mercado_livre');
    assert.equal(resolveAffiliateSubTab(null), 'mercado_livre');
  });
});

describe('tab id guards', () => {
  it('validates known tab ids', () => {
    assert.equal(isSettingsTabId('geral'), true);
    assert.equal(isSettingsTabId('integrador'), false);
    assert.equal(isAffiliateSubTabId('amazon'), true);
    assert.equal(isAffiliateSubTabId('ebay'), false);
  });
});
