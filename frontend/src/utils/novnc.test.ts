import { describe, expect, it } from 'vitest';

import { buildNovncUrl } from './novnc.js';

describe('buildNovncUrl', () => {
  it('retorna null sem porta', () => {
    expect(buildNovncUrl(null)).toBeNull();
    expect(buildNovncUrl(undefined)).toBeNull();
    expect(buildNovncUrl(0)).toBeNull();
  });

  it('monta URL com hostname atual', () => {
    expect(buildNovncUrl(6080)).toBe(
      `http://${window.location.hostname}:6080/vnc_lite.html?scale=true&path=websockify`,
    );
  });
});
