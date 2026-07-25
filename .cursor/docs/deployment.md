# Deployment — Docker

## Serviços (docker-compose)

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| postgres | postgres:16-alpine | 5432 | Banco de dados |
| redis | redis:7-alpine | 6379 | Filas BullMQ + estado compartilhado |
| migrate | build local | — | Aplica migrations (one-shot) |
| collector | build local (bookworm + Chromium) | — | Coleta de ofertas (singleton, browser pooled) |
| scheduler | build local | — | Mensagens automáticas (sem Playwright) |
| worker | build local | — | Envio unificado — WhatsApp + Telegram (todas as contas habilitadas) |
| manager | build local | `MANAGER_PORT` (3000) | Painel admin (stateless) |

O serviço `manager` define `MANAGER_CAN_SPAWN_WORKERS=false` — não inicia workers pelo painel.

## Primeiro deploy

```bash
cp .env.example .env
# Editar .env com valores reais (WHATSAPP_CHANNEL_ID, AFFILIATE_CONFIG, etc.)

docker compose up -d --build
```

Migrations rodam automaticamente no serviço `migrate` antes de `collector`, `scheduler`, `worker` e `manager` subirem.

Painel: `http://localhost:3000/manager`

Volumes `./manager` e `./src` montados no serviço `manager`; `tsx watch` + `MANAGER_HOT_RELOAD=true` recarregam o processo e o browser ao salvar — **sem rebuild** do container.

> No Docker, o **worker** já sobe como serviço separado. Não inicie outro worker pelo painel — use `docker compose restart worker` se precisar reiniciar.

## Autenticação WhatsApp

O worker é dono da sessão. O QR é publicado no Redis e exibido pelo painel.

1. `docker compose up -d` (worker sobe automaticamente)
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

> **Painel no Docker:** o container não tem tela por padrão. Opções:
> - `npm run ml:login` no host (recomendado)
> - **noVNC:** `MANAGER_VNC_ENABLED=true`, rebuild do manager, `http://localhost:6080/vnc_lite.html`
> - **CDP:** `ML_LOGIN_CDP_URL` + Chrome com `--remote-debugging-port=9222`

### noVNC no manager (login ML visual no Docker)

Desktop virtual **Xvfb + x11vnc + noVNC** dentro do container manager — você vê o Chromium no navegador, sem cliente VNC e sem `npm run ml:login` no host.

1. No `.env`:

```bash
MANAGER_VNC_ENABLED=true
# MANAGER_NOVNC_PORT=6080
# MANAGER_VNC_PASSWORD=opcional
```

2. Rebuild e suba o manager:

```bash
docker compose up -d --build manager
```

3. Abra no navegador:

```
http://localhost:6080/vnc_lite.html?scale=true&path=websockify
```

4. No painel (`/manager/accounts`), clique **Logar** no Mercado Livre — o Chromium abre no desktop visível pelo noVNC.

5. Faça login no ML, volte ao painel e clique **Concluir**.

**Se noVNC mostrar "connection is closed" ou o painel falhar com "Missing X server":**

- Confirme `MANAGER_VNC_ENABLED=true` no `.env` e recrie o container: `docker compose up -d --build --force-recreate manager`
- Nos logs do manager deve aparecer `[manager-vnc] Xvfb pronto em :99` antes do servidor HTTP subir
- Se não aparecer, a imagem está desatualizada — rebuild obrigatório após mudanças no `Dockerfile`/`manager-entrypoint.sh`

> O botão **Logar** também abre o noVNC automaticamente em nova aba quando `MANAGER_VNC_ENABLED=true`. Sem senha VNC por padrão — use só em localhost ou defina `MANAGER_VNC_PASSWORD`.

## Telegram

Configure no `.env`:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=@meucanal
```

O worker unificado consome a fila `offer-sender-telegram` junto com WhatsApp. Se nenhum canal estiver habilitado, o worker encerra com exit 0.

## Multi-conta

O worker unificado carrega **todas** as contas habilitadas (WhatsApp e Telegram) via `loadAllWorkerPublishers()`. Não é necessário um serviço Docker por conta — um único processo `worker` consome todas as filas de sender.

Auth paths por conta ficam em `./data/accounts/{accountId}/whatsapp/` (e configs Telegram na tabela `accounts`).

> **Importante:** não escale o serviço `worker` com múltiplas réplicas — sessões Baileys exigem um processo único por auth path (`owner.lock`).

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão PostgreSQL |
| `REDIS_URL` | Conexão Redis |
| `WHATSAPP_CHANNEL_ID` | ID do canal WhatsApp (se WhatsApp ativo) |
| `ML_CATEGORIES` | Categorias ou URLs de listagem |
| `AFFILIATE_CONFIG` | Tag de afiliado (`{"tag":"sua-tag"}`) |

Opcionais: `APP_TIMEZONE`, `ML_AUTH_PATH`, `ML_USE_BROWSER_FALLBACK`, `ML_BROWSER_HEADLESS`, `ML_SEARCH_LIMIT`, `ML_HTTP_TIMEOUT_MS`, `AMAZON_SOURCES`, `AMAZON_AFFILIATE_STORE_ID`, `AMAZON_BASE_URL`, `AMAZON_USE_BROWSER_FALLBACK`, `QUEUE_CONFIG`, `MANAGER_PORT`, `MANAGER_TOKEN`, `MANAGER_CAN_SPAWN_WORKERS`, `REDIS_ENABLED`, `TELEGRAM_ENABLED`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.

## Docker + Playwright

O `Dockerfile` usa `node:22-bookworm-slim` com Chromium instalado para fallback de scraping e geração de links.

- Coleta HTTP funciona sem browser na maioria dos casos.
- Fallback Playwright disponível no container `collector`.
- Login ML recomendado no host ou via painel (requer navegador visível).

## Local (sem Docker)

```bash
# Infra
docker compose up -d postgres redis

# Setup
npm run check
npm run migrate

# Collector + manager (worker: painel em dev ou terminal)
npm run up

# Ou separado:
npm run dev              # collector
npm run worker           # sender unificado (WhatsApp + Telegram)
npm run manager          # painel
```

Em dev local, `MANAGER_CAN_SPAWN_WORKERS=true` (default) permite iniciar o worker unificado pelo painel.

## Scripts npm

| Script | Descrição |
|--------|-----------|
| `up` | Sobe collector + scheduler + manager (com preflight) |
| `check` | Preflight — valida ambiente |
| `setup` | Preflight + guia de setup |
| `dev` | Processo collector (coleta + fila) |
| `scheduler` | Agendador de mensagens automáticas |
| `worker` | Worker de envio unificado (WhatsApp + Telegram) |
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

Todos os processos principais rodam preflight antes de iniciar (`predev`, `preworker`, `premanager`). Use `npm run check` para validar manualmente.
