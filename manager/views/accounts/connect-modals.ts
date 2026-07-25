function isNovncEnabled(): boolean {
  const flag = process.env.MANAGER_VNC_ENABLED;
  return flag === 'true' || flag === '1';
}

function renderMlLoginSteps(): string {
  if (isNovncEnabled()) {
    return `<ol class="connect-steps" id="ml-login-steps">
              <li>Abra o <strong>noVNC</strong> (link abaixo) para ver o desktop do container.</li>
              <li>Clique em <strong>Logar</strong> — o Chromium abre no portal de afiliados.</li>
              <li>Faça login, acesse o <strong>Gerador de Links</strong> e clique em <strong>Concluir</strong> aqui.</li>
            </ol>`;
  }

  return `<ol class="connect-steps" id="ml-login-steps">
            <li>Uma janela do navegador vai abrir no portal de afiliados do Mercado Livre.</li>
            <li>Faça login normalmente e acesse o <strong>Gerador de Links</strong>.</li>
            <li>Volte aqui e clique em <strong>Concluir</strong> para salvar a sessão.</li>
          </ol>`;
}

function renderNovncHelp(): string {
  if (!isNovncEnabled()) {
    return `<p class="modal-help" id="ml-login-docker-help">
              <strong>Docker:</strong> defina <code>MANAGER_VNC_ENABLED=true</code>, rebuild do manager e use o noVNC
              (<code>http://localhost:6080/vnc_lite.html</code>) para ver o navegador do login ML.
            </p>`;
  }

  const port = process.env.MANAGER_NOVNC_PORT ?? '6080';
  return `<p class="modal-help" id="ml-login-novnc-help">
            Abra o desktop do container em
            <a id="ml-novnc-link" href="http://localhost:${port}/vnc_lite.html?scale=true&amp;path=websockify" target="_blank" rel="noopener">
              noVNC (navegador)
            </a>
            — faça login no Mercado Livre na janela que aparecer e volte aqui para clicar <strong>Concluir</strong>.
          </p>`;
}

export function renderAccountConnectModals(): string {
  return `
    <div id="wa-login-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="wa-login-modal-title">
        <div class="modal-header">
          <h3 id="wa-login-modal-title">Logar no WhatsApp</h3>
        </div>
        <div class="modal-body">
          <div class="connect-flow">
            <p class="connect-status" id="wa-login-status">Iniciando conexão…</p>
            <div class="wa-qr-wrap hidden" id="wa-login-qr-wrap">
              <img id="wa-login-qr-img" alt="QR code do WhatsApp" width="280" height="280">
              <p class="modal-help">No celular, abra o WhatsApp › <strong>Aparelhos conectados</strong> › <strong>Conectar um aparelho</strong> e aponte a câmera para o QR acima.</p>
            </div>
            <p class="connect-error hidden" id="wa-login-error"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="wa-login-close">Fechar</button>
        </div>
      </div>
    </div>

    <div id="ml-login-modal" class="modal-overlay hidden" aria-hidden="true">
      <div class="modal modal-wide" role="dialog" aria-modal="true" aria-labelledby="ml-login-modal-title">
        <div class="modal-header">
          <h3 id="ml-login-modal-title">Logar no Mercado Livre</h3>
        </div>
        <div class="modal-body">
          <div class="connect-flow">
            <p class="connect-status" id="ml-login-status">Abrindo o navegador…</p>
            ${renderMlLoginSteps()}
            ${renderNovncHelp()}
            <p class="connect-error hidden" id="ml-login-error"></p>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" id="ml-login-cancel">Cancelar</button>
          <button type="button" class="btn primary" id="ml-login-finish" disabled>Concluir</button>
        </div>
      </div>
    </div>
  `;
}
