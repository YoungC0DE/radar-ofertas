# Frontend React (`frontend/`)

SPA React (Vite + TypeScript) que substitui gradualmente o painel SSR `manager/`. Consome a API REST em `/api/v1` com JWT.

## Stack

- React 19 + React Router 7
- Vite 7 (proxy `/api` → `http://localhost:3001` em dev)
- CSS modular por domínio (`styles/`) — sem framework UI

## Desenvolvimento local

```bash
npm run api          # backend REST :3001
npm run dev:frontend # Vite :5173
```

Login: credenciais `API_ADMIN_USERNAME` / `API_ADMIN_PASSWORD` do `.env`.

## Tema claro / escuro

- **Paleta base:** mesma identidade visual do manager (accent `#3b82f6`, sidebar escura fixa, preview verde `#f0fdf4` no tema claro).
- **Implementação:** tokens CSS em `frontend/src/styles/variables.css` com overrides em `[data-theme='dark']`.
- **Persistência:** `localStorage` chave `radar-theme` (`light` | `dark` | `system`).
- **Toggle:** botão na sidebar (`ThemeToggle`).
- **Anti-flash:** script inline em `frontend/index.html` aplica o tema antes do bundle React.

Componentes sensíveis ao tema (preview de template, badges, alerts, tabelas) usam variáveis semânticas (`--preview-bg`, `--surface`, etc.).

## Páginas implementadas

| Rota | Status |
|------|--------|
| `/login` | ✅ Auth JWT + refresh |
| `/` | ✅ Dashboard |
| `/offers`, `/offers/:id` | ✅ Listagem + detalhe |
| `/template` | ✅ Ofertas, cupom, auto-messages |
| `/settings` | ✅ Geral, Afiliados, Conexões, Operações |
| `/logs` | ✅ Console auditoria + ML scrape |
| `/coupons` | ✅ Listagem, refresh, envio, link da loja |
| `/sources/:channel` | ✅ ML + Amazon por canal |
| `/accounts` | ✅ Integrações + marketplaces, login QR/ML |

## Cupons (`/coupons`)

Paridade com `manager/views/coupons.ts`:

- Tabela de cupons ML com status, código, validade
- **Atualizar cupons** — `POST /coupons/refresh`
- Editar **link da loja** por cupom — `PATCH /coupons/:id/store-link`
- **Enviar ao canal** — `POST /coupons/:id/send`

## Fontes (`/sources/:channel`)

Paridade com `manager/views/sources.ts`:

- Abas WhatsApp / Telegram (quando ambos habilitados)
- Toggles de coleta por fonte ML e Amazon (.env + extras)
- Adicionar/remover links extras
- Salvar seleção por canal — `PATCH /sources/:channel`

## Contas (`/accounts`)

Paridade com `manager/views/accounts.ts`:

- **Integrações** — WhatsApp (canal + destinos, login QR), Telegram (config + verify)
- **Marketplaces** — Mercado Livre (tag afiliado, login sessão Playwright)
- CRUD de contas, toggle habilitar, modais de configuração

API: `GET/POST /accounts`, `PATCH/DELETE /accounts/:id/:platform/*`, endpoints `/connect/*`.

## Template (`/template`)

Paridade com `manager/views/template.ts`:

1. **Mensagem de ofertas** — editor, chips de placeholder, preview live, flags on/off, restaurar padrão
2. **Mensagem de cupom** — idem para cupons ML
3. **Mensagens automáticas** — CRUD + agendamento (manual / once / daily), enviar agora, excluir

API: `GET /template`, `PATCH /template/offer`, `PATCH /template/coupon`, `POST/PATCH/DELETE /auto-messages`.

## Settings (`/settings`)

Paridade parcial com `manager/views/settings/`:

1. **Geral** — brand, fuso, janela operacional, score (editor de tiers), intervalo de coleta, delay entre envios
2. **Afiliados** — ML (URL cupons + links para fontes), Amazon (base URL, tag, prefixo), Shopee (placeholder)
3. **Conexões** — status WhatsApp, Mercado Livre e Telegram; login QR (WA), sessão Playwright (ML), verificação Bot API (Telegram)
4. **Operações** — worker (start/stop/restart + polling), Prisma generate

Pendente: nenhum item da Fase 4 restante nesta página.

API: `GET /settings`, `PATCH /settings/{score,brand,operating-hours,send-interval,sender-delay,coupons-url,amazon-affiliate}`, `GET/POST /worker/*`, `GET/POST /prisma/*`.

## Logs (`/logs`)

Paridade com `manager/views/logs/` + `public/js/logs.js`:

1. **Console ML** — visitas ao site (buffer 200, polling incremental)
2. **Console auditoria** — filtros por nível, busca textual, pausar/retomar, limpar, auto-scroll
3. **Modal** — meta JSON ao clicar em uma linha

Polling a cada 3s via `GET /logs?since=&mlSince=` (SSE/WebSocket fica para fase futura).

## Estrutura

```
frontend/src/
├── api/           # client fetch + tipos
├── auth/          # AuthProvider, rotas protegidas
├── components/    # UI, layout, offers, template, settings, logs, accounts, …
├── constants/     # placeholders espelhados do backend
├── hooks/
├── pages/
├── routes/
├── styles/        # variables (temas), layout, components, offers, template
├── theme/         # ThemeProvider + storage
└── utils/
```

## Build

```bash
npm run build:frontend
```

Saída estática em `frontend/dist/` (nginx/CDN na Fase 5 do roadmap).
