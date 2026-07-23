# Deployment — Docker

## Serviços (docker-compose)

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| postgres | postgres:16-alpine | 5432 | Banco de dados |
| redis | redis:7-alpine | 6379 | Filas BullMQ + estado compartilhado |
| migrate | build local | — | Aplica migrations (one-shot) |
| app | build local (bookworm + Chromium) | — | Collector (scraping + enfileira) |
| worker | build local | — | WhatsApp — envio |
| worker-telegram | build local | — | Telegram — envio |
| manager | build local | `MANAGER_PORT` (3000) | Painel admin (stateless) |

O serviço `manager` define `MANAGER_CAN_SPAWN_WORKERS=false` — não inicia workers pelo painel.

## Primeiro deploy

```bash
cp .env.example .env
# Editar .env com valores reais (WHATSAPP_CHANNEL_ID, AFFILIATE_CONFIG, etc.)

docker compose up -d --build
```

Migrations rodam automaticamente no serviço `migrate` antes de `app`, `worker`, `worker-telegram` e `manager` subirem.

Painel: `http://localhost:3000/manager`

> No Docker, os **workers** já sobem como serviços separados. Não inicie outro worker pelo painel — use `docker compose restart worker` ou `docker compose restart worker-telegram` se precisar reiniciar.

## Autenticação WhatsApp

O worker é dono da sessão. O QR é publicado no Redis e exibido pelo painel.

1. `docker compose up -d` (workers sobem automaticamente)
2. Settings → Conectar WhatsApp → escanear QR exibido no modal
3. Status do worker visível em Settings → Operações (via `owner.lock` + heartbeat Redis)

Via CLI (no host):

```bash
npm run wa:login
```

Ou via logs do worker Docker: `docker compose logs -f worker` e escanear QR no terminal. Sessão persistida em `./data/auth_info_baileys`.

## Autenticação Mercado Livre (afiliado)

Via painel (single-node — abre browser local ao manager):

1. Settings → Conectar Mercado Livre
2. Login manual no navegador aberto
3. Clicar em "Salvar sessão"

Via CLI (no host, navegador visível):

```bash
npm run ml:login
```

Sessão salva em `./data/ml_auth/` (montado no container via volume `./data`). Repetir quando links de afiliado falharem (cookie expirado).

## Telegram

Configure no `.env`:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=@meucanal
```

O serviço `worker-telegram` encerra com exit 0 se `TELEGRAM_ENABLED` não estiver ligado.

## Multi-conta

Para worker de conta adicional:

```bash
WORKER_ACCOUNT_ID=minha-conta-wa docker compose run --rm worker
```

Ou adicionar serviço no `docker-compose.yml` com `WORKER_ACCOUNT_ID` no environment.

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão PostgreSQL |
| `REDIS_URL` | Conexão Redis |
| `WHATSAPP_CHANNEL_ID` | ID do canal WhatsApp (se WhatsApp ativo) |
| `ML_CATEGORIES` | Categorias ou URLs de listagem |
| `AFFILIATE_CONFIG` | Tag de afiliado (`{"tag":"sua-tag"}`) |

Opcionais: `APP_TIMEZONE`, `ML_AUTH_PATH`, `ML_USE_BROWSER_FALLBACK`, `ML_BROWSER_HEADLESS`, `ML_SEARCH_LIMIT`, `ML_HTTP_TIMEOUT_MS`, `QUEUE_CONFIG`, `MANAGER_PORT`, `MANAGER_TOKEN`, `MANAGER_CAN_SPAWN_WORKERS`, `WORKER_ACCOUNT_ID`, `REDIS_ENABLED`, `TELEGRAM_ENABLED`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Docker + Playwright

O `Dockerfile` usa `node:22-bookworm-slim` com Chromium instalado para fallback de scraping e geração de links.

- Coleta HTTP funciona sem browser na maioria dos casos.
- Fallback Playwright disponível no container `app`.
- Login ML recomendado no host ou via painel (requer navegador visível).

## Local (sem Docker)

```bash
# Infra
docker compose up -d postgres redis

# Setup
npm run check
npm run migrate

# Collector + manager (workers: painel em dev ou terminal)
npm run up

# Ou separado:
npm run dev              # collector
npm run worker           # sender WhatsApp
WORKER_ACCOUNT_ID=x npm run worker   # conta específica
npm run worker:telegram  # sender Telegram
npm run manager          # painel
```

Em dev local, `MANAGER_CAN_SPAWN_WORKERS=true` (default) permite iniciar workers pelo painel.

## Scripts npm

| Script | Descrição |
|--------|-----------|
| `up` | Sobe collector + manager (com preflight) |
| `check` | Preflight — valida ambiente |
| `setup` | Preflight + guia de setup |
| `dev` | Collector + fila de coleta |
| `worker` | Worker de envio WhatsApp |
| `worker:telegram` | Worker de envio Telegram |
| `manager` | Painel web admin |
| `ml:login` | Login afiliado ML (salva sessão) |
| `wa:login` | Login WhatsApp (QR) |
| `wa:channel` | Obter ID do canal |
| `migrate` | Prisma migrate dev |
| `test` | Testes unitários (`node:test`) |
| `build` | Compila TypeScript (`src/` apenas) |
| `e2e:test` | Teste E2E manual |

## CI

`.github/workflows/ci.yml` — em push/PR para `main`:

1. `npm ci`
2. `npx tsc -p tsconfig.check.json --noEmit` (inclui `src/` e `manager/`)
3. `npm test`

## Preflight

Todos os processos principais rodam preflight antes de iniciar (`predev`, `preworker`, `preworker:telegram`, `premanager`). Use `npm run check` para validar manualmente.
