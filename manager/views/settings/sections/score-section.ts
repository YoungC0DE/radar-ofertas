import {
  SCORE_CATEGORY_KEYS,
  SCORE_CATEGORY_LABELS,
  type ScoreCategoryKey,
  type ScoreTier,
} from '../../../../src/config/score-config.js';
import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import { configRow, EDIT_ICON } from '../../components/index.js';

function scoreComparatorLabel(key: ScoreCategoryKey): string {
  return key === 'price' ? '≤' : '≥';
}

function scoreUnitLabel(key: ScoreCategoryKey): string {
  if (key === 'discount') return '%';
  if (key === 'rating') return 'estrelas';
  if (key === 'soldQuantity') return 'un.';
  return 'R$';
}

function renderScoreTierFields(key: ScoreCategoryKey, index: number, tier: ScoreTier): string {
  const step = key === 'rating' ? '0.1' : '1';
  const maxAttr = key === 'discount' ? ' max="100"' : key === 'rating' ? ' max="5"' : '';

  return `<div class="score-tier">
    <label class="score-tier-flag">
      <input type="checkbox" name="${key}Tier${index}Enabled" value="1"${tier.enabled ? ' checked' : ''}>
      <span class="score-tier-label">Faixa ${index + 1}</span>
    </label>
    <div class="score-tier-rule">
      <span class="score-tier-cmp">${scoreComparatorLabel(key)}</span>
      <input type="number" name="${key}Tier${index}Threshold" value="${tier.threshold}" min="0" step="${step}" class="score-tier-input"${maxAttr}>
      <span class="score-tier-unit">${scoreUnitLabel(key)}</span>
      <span class="score-tier-arrow">→</span>
      <span class="score-tier-points-label">+</span>
      <input type="number" name="${key}Tier${index}Points" value="${tier.points}" min="0" step="1" class="score-tier-input score-tier-points">
      <span class="score-tier-unit">pts</span>
    </div>
  </div>`;
}

export function renderScoreCategoryBlock(key: ScoreCategoryKey, data: SettingsData): string {
  const category = data.scoreConfig[key];
  const tiers = category.tiers.map((tier, index) => renderScoreTierFields(key, index, tier)).join('');

  return `<div class="score-category">
    <label class="score-category-flag">
      <input type="checkbox" name="${key}Enabled" value="1"${category.enabled ? ' checked' : ''}>
      <strong>${SCORE_CATEGORY_LABELS[key]}</strong>
    </label>
    <div class="score-tier-list">${tiers}</div>
  </div>`;
}

export function renderScoreSection(data: SettingsData): string {
  const rulesHint =
    data.scoreRulesSummary.length > 0
      ? data.scoreRulesSummary.map((line) => escapeHtml(line)).join('<br>')
      : '<span class="meta">Nenhuma regra ativa</span>';

  const value = `
    <div class="channel-inline score-settings-inline">
      <div>
        <div class="channel-name">Mínimo: ${data.minScore} pts</div>
        <div class="score-rules-summary meta">${rulesHint}</div>
      </div>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-score" title="Editar pontuação">${EDIT_ICON}</button>
      </div>
    </div>`;

  return configRow('Pontuação', value, 'Critérios e score mínimo para aceitar ofertas');
}

export { SCORE_CATEGORY_KEYS };
