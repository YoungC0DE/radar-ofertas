import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { endHourForForm } from './operating-hours-section.js';

describe('endHourForForm', () => {
  it('mapeia meia-noite (0) para 24 no formulário', () => {
    assert.equal(endHourForForm(0), 24);
  });

  it('mantém demais horas', () => {
    assert.equal(endHourForForm(18), 18);
    assert.equal(endHourForForm(23), 23);
  });
});
