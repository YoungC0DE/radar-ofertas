# Manager — Painel Web

Painel admin server-rendered em `manager/`. Sem framework frontend — HTML gerado em TypeScript.

## Acesso

```bash
npm run manager
# → http://localhost:3000/manager (porta via MANAGER_PORT)
```

Auth opcional: `MANAGER_TOKEN` exige `?token=...` ou header `Authorization: Bearer`. Se ausente, **libera tudo** — adequado para uso local/VPN; não expor publicamente sem token.

> **Limitação:** forms HTML não propagam o token automaticamente. Com `MANAGER_TOKEN` definido, POSTs de formulário tendem a retornar 401. CSRF não implementado.

## Páginas

| Rota | Descrição |
|------|-----------|
| `/manager` | Dashboard — status, coleta manual, envio imediato |
| `/manager/offers` | Lista de ofertas (filtro por status) |
| `/manager/offers/:id` | Detalhe da oferta + preview da mensagem |
| `/manager/coupons` | Cupons ML — refresh, envio, link de loja |
| `/manager/accounts` | Contas multi-plataforma (WhatsApp, Telegram, ML) |
| `/manager/sources/:channel` | Fontes de coleta por canal (`whatsapp` \| `telegram`) |
| `/manager/settings` | Score, brand, horários, intervalos, conexões, workers |
| `/manager/template` | Template de ofertas + cupons + mensagens automáticas |
| `/manager/logs` | Logs da aplicação (collector, worker, manager) |
| `/manager/health` | Health check (`ok`) |
| `/manager/api/metrics` | Métricas de envio (JSON) |
| `/manager/api/logs` | Logs em JSON (Redis via `log-store.ts`) |
| `/manager/api/coupons` | Cupons em JSON (refresh sob demanda) |

## Estrutura MVC

```
manager/
├── server.ts              → entry point
├── app.ts                 → createServer → handleManagerRequest
├── http/
│   ├── request.ts         → createRouter, auth, helpers HTTP
│   ├── static.ts          → assets em /manager/assets/*
│   └── routes/index.ts    → rotas declarativas por domínio (~54 rotas)
├── routes/index.ts        → exporta handleManagerRequest
├── controllers/           → handlers finos (parse form, redirect, JSON)
├── models/
│   ├── shared/            → save-result, db helpers
│   ├── logs/              → classificação de logs
│   └── *.ts               → dados por página; reutiliza src/
├── views/
│   ├── components/        → cards, badges, icons, config-row
│   ├── layout/            → shell HTML + nav
│   ├── settings/          → página + sections/ + modals
│   ├── logs/              → view de logs
│   └── *.ts               → demais páginas
└── public/
    ├── css/               → base.css + um arquivo por página
    └── js/                → interatividade client-side
```

Rotas agrupadas em `http/routes/index.ts`: `dashboardRoutes`, `offersRoutes`, `settingsRoutes`, `templateRoutes`, `logsRoutes`, `couponsRoutes`, `sourcesRoutes`, `connectionRoutes`, `processRoutes`, `accountsRoutes`.

## Settings editáveis

Tudo persiste na tabela `settings` e é lido pelos processos via cache:

- **Score** — tiers por desconto, avaliação, vendas, preço
- **Brand** — nome, subtítulo, logo (base64)
- **Horários** — janela operacional de envio
- **Intervalos** — coleta e delay entre envios
- **Fontes ML** — categorias do `.env` (ativar/desativar) + URLs customizadas **por canal**
- **Canal** — invite link do WhatsApp
- **Template** — mensagem de ofertas e cupons com placeholders
- **Auto-messages** — mensagens programadas (manual / once / daily)
- **Cupons** — URL da página de cupons ML
- **Links afiliado** — delay entre gerações e backoff quando há backlog (em `/manager/offers`)

## Conexões (via painel)

| Integração | Fluxo no painel | Persistência |
|------------|-----------------|--------------|
| WhatsApp | QR em Settings → Conectar (lido do Redis, publicado pelo worker) | `WHATSAPP_AUTH_PATH` |
| Mercado Livre | Navegador → login manual → "Salvar sessão" (single-node) | `ML_AUTH_PATH` |
| Telegram | Validação via `npm run check` (token + chatId) | `.env` |

APIs JSON de conexão:

| Endpoint | Método | Função |
|----------|--------|--------|
| `/manager/settings/connect/wa/start` | POST | Inicia pareamento WhatsApp |
| `/manager/settings/connect/wa/status` | GET | Status + QR |
| `/manager/settings/connect/ml/start` | POST | Abre navegador ML |
| `/manager/settings/connect/ml/finish` | POST | Salva sessão após login |
| `/manager/settings/connect/ml/cancel` | POST | Cancela fluxo ML |
| `/manager/settings/connect/ml/status` | GET | Status do fluxo ML |
| `/manager/settings/connect/telegram/status` | GET | Status da config Telegram |

> O **worker** é dono da sessão WhatsApp. O QR e o status de conexão são publicados em Redis (`radar:connect:wa:{accountId}`) pelo worker; o painel apenas lê e renderiza (stateless, replicável).

## Workers de envio

O `npm run up` sobe collector + manager, **não** os workers — evita dois processos disputando a sessão WhatsApp.

| Modo | Comportamento |
|------|---------------|
| Dev (`MANAGER_CAN_SPAWN_WORKERS=true`) | Painel pode iniciar/parar workers via spawn |
| Produção/Docker (`MANAGER_CAN_SPAWN_WORKERS=false`) | Workers são serviços separados; painel só exibe status |

Status derivado de:
- **WhatsApp:** `owner.lock` na pasta de auth + heartbeat Redis (`radar:worker:{channel}:{accountId}`)
- **Telegram:** heartbeat Redis

| Endpoint | Método | Função |
|----------|--------|--------|
| `/manager/settings/worker/start` | POST | Inicia worker (`?channel=whatsapp\|telegram`) — só com spawn habilitado |
| `/manager/settings/worker/stop` | POST | Encerra worker — só com spawn habilitado |
| `/manager/settings/worker/restart` | POST | Reinicia worker — só com spawn habilitado |
| `/manager/settings/worker/status` | GET | Status do processo (externo ou local) |

Login ML (`connection-model.ts`) permanece stateful no processo do manager — operação single-node/dev.

## Segurança

| Tema | Situação |
|------|----------|
| Auth | `MANAGER_TOKEN` opcional; sem token = acesso livre |
| CSRF | Ausente em todos os POSTs |
| XSS | `escapeHtml` em views (não escapa `'` — risco em atributos JS como `onsubmit` em `accounts.ts`) |
| Static files | Path traversal protegido em `http/static.ts` |
| Body size | `readFormBody` sem limite — risco de DoS em POST |

## Regras

- Manager **não** contém regra de negócio — delega para `src/`.
- `src/` nunca importa de `manager/`.
- Models do manager importam funções de `src/config/`, `src/offers/`, `src/accounts/`, etc.
- Controllers devem ser finos; evitar import direto de `src/` (exceções atuais: `offers-controller`, `dashboard-controller`).

## Preflight e CI

- `npm run manager` executa `preflight --profile=manager` antes de subir.
- Tipos checados via `npx tsc -p tsconfig.check.json` (inclui `manager/`).
- CI: `.github/workflows/ci.yml` — `tsc` + `npm test` em PRs e push para `main`.
