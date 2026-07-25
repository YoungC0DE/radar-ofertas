import {
  AFFILIATE_PLATFORM_DEFINITIONS,
  type AffiliatePlatformDefinition,
} from '../../../../src/affiliates/index.js';
import {
  buildAmazonAffiliateLink,
  EXAMPLE_AMAZON_ASIN,
} from '../../../../src/amazon/index.js';
import type { SettingsData } from '../../../models/settings-model.js';
import { escapeHtml } from '../../helpers.js';
import {
  EDIT_ICON,
  configRow,
  renderTabs,
  renderAccordionStatusBadge,
} from '../../components/index.js';
import type { AffiliateSubTabId } from '../tab-state.js';

function renderMercadoLivrePanel(data: SettingsData): string {
  const couponsValue = `
    <div class="channel-inline">
      <code class="coupons-url-preview">${escapeHtml(data.mlCouponsUrl)}</code>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-coupons-url" title="Editar URL de cupons">${EDIT_ICON}</button>
      </div>
    </div>`;

  const sourceLinks = [
    `<a class="link" href="/manager/sources/whatsapp">Fontes do WhatsApp</a>`,
    ...(data.telegramEnabled
      ? [`<a class="link" href="/manager/sources/telegram">Fontes do Telegram</a>`]
      : []),
  ].join(' · ');

  return `
    <div class="affiliate-panel-grid affiliate-panel-config-only">
      <div class="affiliate-panel-config">
        ${configRow('URL de cupons', couponsValue, 'Hub de cupons do portal de afiliados')}
        ${configRow(
          'Fontes de coleta',
          `<div class="config-value">${sourceLinks}</div>`,
          'Categorias e URLs monitoradas — uma seleção por canal de envio',
        )}
      </div>
    </div>`;
}

function renderAmazonPanel(data: SettingsData): string {
  const exampleLink = buildAmazonAffiliateLink(EXAMPLE_AMAZON_ASIN, {
    affiliateLinkPrefix: data.amazonAffiliateLinkPrefix,
    baseUrl: data.amazonBaseUrl,
    storeId: data.amazonAffiliateStoreId,
  }).url;

  const baseUrlValue = `
    <div class="channel-inline">
      <code class="coupons-url-preview">${escapeHtml(data.amazonBaseUrl)}</code>
    </div>`;

  const affiliatePrefixValue = data.amazonAffiliateLinkPrefix.trim()
    ? `
    <div class="channel-inline">
      <code class="coupons-url-preview">${escapeHtml(data.amazonAffiliateLinkPrefix)}</code>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-amazon-affiliate" title="Editar links Amazon">${EDIT_ICON}</button>
      </div>
    </div>`
    : `
    <div class="channel-inline">
      <span class="meta">Não usado — links gerados com ?tag=</span>
      <div class="channel-actions">
        <button type="button" class="btn btn-sm btn-icon" id="edit-amazon-affiliate" title="Editar links Amazon">${EDIT_ICON}</button>
      </div>
    </div>`;

  const storeIdValue = `
    <div class="channel-inline">
      <code class="coupons-url-preview">${escapeHtml(data.amazonAffiliateStoreId || '—')}</code>
    </div>`;

  return `
    <div class="affiliate-panel-config">
      ${configRow('Site Amazon', baseUrlValue, 'Home do marketplace — ex.: amazon.com.br')}
      ${configRow('ID da loja (tag)', storeIdValue, 'Obrigatório — ex.: mercadaodasfa-20')}
      ${configRow(
        'Prefixo customizado',
        affiliatePrefixValue,
        'Opcional — deixe vazio para usar o formato oficial amazon.com.br/dp/ASIN?tag=...',
      )}
      ${configRow(
        'Exemplo gerado',
        `<code class="coupons-url-preview">${escapeHtml(exampleLink)}</code>`,
        `ASIN ${EXAMPLE_AMAZON_ASIN} com sua tag de afiliado`,
      )}
      ${configRow(
        'Fontes de coleta',
        `<div class="config-value"><a class="link" href="/manager/sources/whatsapp">Fontes do WhatsApp</a>${
          data.telegramEnabled
            ? ` · <a class="link" href="/manager/sources/telegram">Fontes do Telegram</a>`
            : ''
        }</div>`,
        'Browse nodes, buscas e produtos Amazon — mesma página de fontes por canal',
      )}
      <p class="meta affiliate-coming-soon-note">Links de afiliado gerados automaticamente com amazon.com.br/dp/ASIN?tag=sua-loja.</p>
    </div>`;
}

function renderComingSoonPanel(label: string): string {
  return `
    <div class="affiliate-coming-soon">
      <p>O programa <strong>${escapeHtml(label)}</strong> ainda não está disponível nesta instalação.</p>
      <p class="meta">A estrutura de contas, fontes de coleta e sessão de afiliado seguirá o mesmo padrão do Mercado Livre.</p>
    </div>`;
}

function renderAffiliatePanelContent(
  platform: AffiliatePlatformDefinition,
  data: SettingsData,
): string {
  const intro = platform.description
    ? `<p class="meta affiliate-platform-intro">${escapeHtml(platform.description)}</p>`
    : '';

  const body =
    platform.id === 'mercado_livre'
      ? renderMercadoLivrePanel(data)
      : platform.id === 'amazon'
        ? renderAmazonPanel(data)
        : renderComingSoonPanel(platform.label);

  return `${intro}${body}`;
}

export function renderAffiliateProgramsSection(
  data: SettingsData,
  activeSubTab: AffiliateSubTabId = 'mercado_livre',
): string {
  const subTabs = renderTabs(
    AFFILIATE_PLATFORM_DEFINITIONS.map((platform) => ({
      id: platform.id,
      label: platform.label,
      badgeHtml: ` ${renderAccordionStatusBadge(platform.status)}`,
      content: renderAffiliatePanelContent(platform, data),
    })),
    {
      activeId: activeSubTab,
      variant: 'sub',
      ariaLabel: 'Programas de afiliados',
    },
  );

  return `
    <section class="settings-panel-section affiliate-programs-section">
      <p class="meta">Cada marketplace tem sessão, fontes de coleta e cupons próprios.</p>
      ${subTabs}
    </section>`;
}
