import type { SettingsData } from '../../models/settings-model.js';
import { escapeHtml } from '../helpers.js';
import { renderBrandRemoveLogoField } from './sections/brand-section.js';
import { endHourForForm, renderHourInput } from './sections/operating-hours-section.js';
import { renderScoreCategoryBlock, SCORE_CATEGORY_KEYS } from './sections/score-section.js';

export function renderSettingsModals(data: SettingsData): string {
  const removeLogoField = renderBrandRemoveLogoField(data);
  return `
    <div id="prisma-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="prisma-modal-title">
        <div class="modal-header">
          <h3 id="prisma-modal-title">Gerar Prisma Client</h3>
        </div>
        <div class="modal-body">
          <p class="connect-status" id="prisma-status">Executando <code>prisma generate</code>…</p>
          <pre class="op-output" id="prisma-output"></pre>
          <p class="connect-error hidden" id="prisma-error"></p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="prisma-close">Fechar</button>
        </div>
      </div>
    </div>

    <div id="ml-connect-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ml-connect-modal-title">
        <div class="modal-header">
          <h3 id="ml-connect-modal-title">Conectar ao Mercado Livre</h3>
        </div>
        <div class="modal-body">
          <div class="connect-flow" id="ml-connect-flow">
            <p class="connect-status" id="ml-connect-status">Abrindo o navegador…</p>
            <ol class="connect-steps" id="ml-connect-steps">
              <li>Uma janela do navegador vai abrir no portal de afiliados do Mercado Livre.</li>
              <li>Faça login normalmente e acesse o <strong>Gerador de Links</strong>.</li>
              <li>Volte aqui e clique em <strong>Concluir</strong> para salvar a sessão.</li>
            </ol>
            <p class="connect-error hidden" id="ml-connect-error"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="ml-connect-cancel">Cancelar</button>
          <button type="button" class="btn primary" id="ml-connect-finish" disabled>Concluir</button>
        </div>
      </div>
    </div>

    <div id="wa-connect-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="wa-connect-modal-title">
        <div class="modal-header">
          <h3 id="wa-connect-modal-title">Conectar ao WhatsApp</h3>
        </div>
        <div class="modal-body">
          <div class="connect-flow" id="wa-connect-flow">
            <p class="connect-status" id="wa-connect-status">Iniciando conexão…</p>
            <div class="wa-qr-wrap hidden" id="wa-qr-wrap">
              <img id="wa-qr-img" alt="QR code do WhatsApp" width="280" height="280">
              <p class="modal-help">No celular, abra o WhatsApp › <strong>Aparelhos conectados</strong> › <strong>Conectar um aparelho</strong> e aponte a câmera para o QR acima.</p>
            </div>
            <p class="connect-error hidden" id="wa-connect-error"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="wa-connect-close">Fechar</button>
        </div>
      </div>
    </div>

    <div id="coupons-url-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="coupons-url-modal-title">
        <div class="modal-header">
          <h3 id="coupons-url-modal-title">Editar URL de cupons</h3>
        </div>
        <form method="post" action="/manager/settings/coupons-url">
          <div class="modal-body">
            <label for="modal-coupons-url" class="modal-label">URL do hub de cupons</label>
            <input
              type="url"
              id="modal-coupons-url"
              name="couponsUrl"
              value="${escapeHtml(data.mlCouponsUrl)}"
              required
              class="modal-input"
            >
            <p class="modal-help">Ex.: https://www.mercadolivre.com.br/afiliados/coupons#hub</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="coupons-url-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="channel-link-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="channel-link-modal-title">
        <div class="modal-header">
          <h3 id="channel-link-modal-title">Editar link do canal</h3>
        </div>
        <form method="post" action="/manager/settings/channel-link">
          <div class="modal-body">
            <label for="modal-invite-link" class="modal-label">Link de compartilhamento</label>
            <input
              type="url"
              id="modal-invite-link"
              name="inviteLink"
              value="${escapeHtml(data.channelInviteLink)}"
              placeholder="https://whatsapp.com/channel/..."
              spellcheck="false"
              class="modal-input"
            >
            <p class="modal-help">Cole o link de convite do seu canal WhatsApp.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="channel-link-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="operating-hours-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="operating-hours-modal-title">
        <div class="modal-header">
          <h3 id="operating-hours-modal-title">Editar janela operacional</h3>
        </div>
        <form method="post" action="/manager/settings/operating-hours">
          <div class="modal-body">
            <div class="hours-row">
              <div>
                <label for="modal-start-hour" class="modal-label">Início</label>
                ${renderHourInput('startHour', 'modal-start-hour', data.operatingHours.start, 'start')}
              </div>
              <div>
                <label for="modal-end-hour" class="modal-label">Fim</label>
                ${renderHourInput('endHour', 'modal-end-hour', endHourForForm(data.operatingHours.end), 'end')}
              </div>
            </div>
            <p class="modal-help">O bot só coleta e envia ofertas dentro deste intervalo (fuso: ${escapeHtml(data.timezone)}). Informe a hora cheia — ex.: 9 = 09:00. Use 24 como fim do dia.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="operating-hours-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="send-interval-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="send-interval-modal-title">
        <div class="modal-header">
          <h3 id="send-interval-modal-title">Editar intervalo de envio</h3>
        </div>
        <form method="post" action="/manager/settings/send-interval">
          <div class="modal-body">
            <label for="modal-interval-minutes" class="modal-label">Intervalo (minutos)</label>
            <input
              type="number"
              id="modal-interval-minutes"
              name="intervalMinutes"
              value="${data.collectorIntervalMinutes}"
              min="1"
              max="1440"
              step="1"
              required
              class="modal-input"
            >
            <p class="modal-help">Define de quanto em quanto tempo o bot busca e envia novas ofertas (1 a 1440 min).</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="send-interval-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="sender-delay-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="sender-delay-modal-title">
        <div class="modal-header">
          <h3 id="sender-delay-modal-title">Editar tempo entre envios</h3>
        </div>
        <form method="post" action="/manager/settings/sender-delay">
          <div class="modal-body">
            <label for="modal-sender-delay-minutes" class="modal-label">Intervalo (minutos)</label>
            <input
              type="number"
              id="modal-sender-delay-minutes"
              name="senderDelayMinutes"
              value="${data.senderDelayMinutes}"
              min="0"
              max="1440"
              step="1"
              required
              class="modal-input"
            >
            <p class="modal-help">Tempo de espera entre cada oferta enviada no WhatsApp (0 a 1440 min). Use 0 para envio imediato.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="sender-delay-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="score-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-score" role="dialog" aria-modal="true" aria-labelledby="score-modal-title">
        <div class="modal-header">
          <h3 id="score-modal-title">Editar pontuação</h3>
        </div>
        <form method="post" action="/manager/settings/score">
          <div class="modal-body">
            <div class="score-min-row">
              <div class="score-min-field">
                <label for="modal-min-score" class="modal-label">Score mínimo para aceitar oferta</label>
                <input
                  type="number"
                  id="modal-min-score"
                  name="minScore"
                  value="${data.minScore}"
                  min="0"
                  step="1"
                  required
                  class="modal-input score-min-input"
                >
              </div>
              <p class="modal-help score-min-help">Ofertas com score abaixo deste valor são descartadas.</p>
            </div>
            <div class="score-categories-grid">
              ${SCORE_CATEGORY_KEYS.map((key) => renderScoreCategoryBlock(key, data)).join('')}
            </div>
            <p class="modal-help">Use as flags para ativar/desativar categorias e faixas. Em cada categoria, só a melhor faixa aplicável conta — exceto em Preço, onde as faixas podem somar.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="score-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

    <div id="brand-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="brand-modal-title">
        <div class="modal-header">
          <h3 id="brand-modal-title">Editar identidade visual</h3>
        </div>
        <form method="post" action="/manager/settings/brand" id="brand-form">
          <div class="modal-body">
            <div class="brand-modal-preview">
              <div class="brand-preview-mark" id="modal-brand-mark">${
                data.brandLogoHref
                  ? `<img src="${escapeHtml(data.brandLogoHref)}" alt="" id="modal-brand-img">`
                  : escapeHtml(data.brandInitial)
              }</div>
              <div>
                <div class="brand-preview-name" id="modal-brand-name-preview">${escapeHtml(data.brandName)}</div>
                <div class="meta" id="modal-brand-sub-preview">${escapeHtml(data.brandSubtitle)}</div>
              </div>
            </div>
            <label for="modal-brand-name" class="modal-label">Nome do painel</label>
            <input
              type="text"
              id="modal-brand-name"
              name="brandName"
              value="${escapeHtml(data.brandName)}"
              maxlength="80"
              required
              class="modal-input"
            >
            <label for="modal-brand-subtitle" class="modal-label">Subtítulo</label>
            <input
              type="text"
              id="modal-brand-subtitle"
              name="brandSubtitle"
              value="${escapeHtml(data.brandSubtitle)}"
              maxlength="120"
              class="modal-input"
            >
            <label for="modal-brand-logo-file" class="modal-label">Imagem do ícone</label>
            <input type="file" id="modal-brand-logo-file" accept="image/png,image/jpeg,image/webp,image/gif">
            <input type="hidden" name="logoData" id="modal-brand-logo-data" value="">
            ${removeLogoField}
            <p class="modal-help">A imagem é salva em base64 no arquivo de configuração. Se nenhuma for definida, será exibida a inicial do nome.</p>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn modal-cancel" data-modal="brand-modal">Cancelar</button>
            <button type="submit" class="btn primary">Salvar</button>
          </div>
        </form>
      </div>
    </div>

  `;
}
