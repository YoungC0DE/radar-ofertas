# Radar Ofertas

Bot automatizado que coleta ofertas do **Mercado Livre** e da **Amazon** via scraping híbrido (HTTP + Playwright), pontua oportunidades, gera links de afiliado e publica em **WhatsApp** (Baileys) e **Telegram** (Bot API). Um **worker unificado** consome todas as filas de envio (todas as contas habilitadas). Painel **React** (`frontend/`) + **API REST** (`backend/api/`).

## Stack

Node.js, TypeScript, Cheerio, Playwright, Baileys, PostgreSQL, Redis, BullMQ, Docker, Prisma.

## Estrutura

```
backend/
├── src/                  → domínio, workers (collector, scheduler, worker)
├── api/                  → API REST Fastify (/api/v1)
├── manager/models/       → models de dados da API (temporário)
└── prisma/               → schema e migrations

frontend/                 → SPA React (Vite)
packages/shared/          → DTOs/tipos compartilhados com o frontend
docker/                   → Dockerfiles, nginx, entrypoints
```

## Início rápido (Docker)

> **Use Docker para subir e testar o sistema.** O fluxo via `npm run up` / Vite (`:5173`) existe só para desenvolvimento ativo de código — não é o caminho recomendado para validar o produto.

```bash
cp .env.example .env
# Edite .env: JWT_SECRET (≥ 32 chars), API_ADMIN_*, AFFILIATE_CONFIG, etc.

docker compose up -d --build
```

Painel: **http://localhost:3000** — login com `API_ADMIN_USERNAME` / `API_ADMIN_PASSWORD` (padrão: `admin` / `admin12345`).

O serviço `migrate` aplica as migrations automaticamente na primeira subida. Não é necessário rodar `npm install` nem `npm run migrate` no host.

### Serviços

| Serviço | Função |
|---------|--------|
| `postgres` / `redis` | Infraestrutura |
| `migrate` | Aplica migrations (one-shot) |
| `collector` | Coleta de ofertas (singleton) |
| `scheduler` | Mensagens automáticas |
| `worker` | Envio unificado — WhatsApp + Telegram |
| `api` | API REST + noVNC opcional (login ML) |
| `frontend` | SPA React (nginx) — proxy `/api` → `api` |

### Após subir

1. **Conexões** — WhatsApp (QR) e Mercado Livre (login afiliado via painel ou noVNC).
2. **Worker** — já roda como serviço Docker `worker` (não use spawn pelo painel).
3. **Score, template, horários** — Settings no painel (persistido no banco).

```bash
docker compose ps
docker compose logs -f worker
docker compose logs -f collector
docker compose restart worker
```

Não escale o `worker` — um único processo gerencia todas as sessões e filas. Sessões persistidas em `./data` (volume montado nos containers), incluindo `data/accounts/{id}/` para multi-conta.

### Login Mercado Livre no Docker (noVNC)

Com `MANAGER_VNC_ENABLED=true` no `.env` (padrão no `.env.example`):

```bash
docker compose up -d --build api
# http://localhost:6080/vnc_lite.html?scale=true&path=websockify
```

Use Settings › Conexões no painel para iniciar o fluxo de login ML dentro do container.

### Health checks

```bash
curl http://localhost:3001/api/v1/health
curl http://localhost:3001/api/v1/health/collector
curl http://localhost:3001/api/v1/health/worker
```

> Em Docker, a API escuta na rede interna (`api:3001`). O frontend faz proxy de `/api` em `:3000`. Para `curl` direto na API a partir do host, exponha `API_PORT` no `docker-compose.yml` se necessário, ou use o painel.

### Telegram (opcional)

1. Crie o bot no [@BotFather](https://t.me/BotFather) e copie o token
2. Adicione o bot como **administrador** do canal, com permissão de publicar
3. No `.env`:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=@meucanal
```

Reconstrua os serviços afetados: `docker compose up -d --build worker collector`.

### Amazon (opcional)

1. Obtenha o **ID da loja** no painel Amazon › Compartilhar links de afiliados
2. No `.env`:

```bash
AMAZON_AFFILIATE_STORE_ID=sua-loja-20
AMAZON_SOURCES=https://www.amazon.com.br/b/node/122326793011
```

3. Ative fontes por canal em `/sources/whatsapp` (ou `telegram`)
4. Ajuste base URL e tag em Settings › Afiliados › Amazon

## Desenvolvimento local (npm — opcional)

Somente para quem está **alterando código** e quer hot reload. **Não use este fluxo para testar o sistema como usuário.**

```bash
cp .env.example .env
docker compose up -d postgres redis   # só infra no Docker
npm install
npm run migrate:deploy
npm run check
npm run up                            # collector + scheduler + API + Vite :5173
```

Painel dev: `http://localhost:5173`. Worker: `npm run worker` ou spawn pelo painel (`MANAGER_CAN_SPAWN_WORKERS=true`).

CLI auxiliar (host, sem Docker completo):

```bash
npm run ml:login         # sessão afiliado ML
npm run wa:login         # sessão WhatsApp (QR no terminal)
```

## Scripts npm (referência)

| Comando | Descrição |
|---------|-----------|
| `docker compose up -d --build` | **Recomendado** — sobe stack completa |
| `npm run check` | Valida ambiente (DB, Redis, JWT, sessões) |
| `npm run up` | Dev: collector + scheduler + API + frontend |
| `npm run dev` | Dev: collector |
| `npm run worker` | Dev: worker unificado |
| `npm run api` | Dev: API REST (:3001) |
| `npm run dev:frontend` | Dev: Vite (:5173) |
| `npm run migrate:deploy` | Prisma migrate (host ou CI) |
| `npm run test` | Testes unitários |
| `npm run test:e2e` | E2E Playwright da SPA |
| `npm run build:frontend` | Build estático do React |

## Documentação

Consulte `.cursor/docs/` para arquitetura, canais, filas, banco e deploy.

| Doc | Conteúdo |
|-----|----------|
| [deployment.md](.cursor/docs/deployment.md) | Docker, serviços, noVNC |
| [frontend-api.md](.cursor/docs/frontend-api.md) | SPA React + API REST |
| [local-development.md](.cursor/docs/local-development.md) | Dev npm (secundário) |
| [troubleshooting.md](.cursor/docs/troubleshooting.md) | Sessão ML, anti-bot, health |
| [architecture.md](.cursor/docs/architecture.md) | Visão geral e fluxo |
| [database.md](.cursor/docs/database.md) | Schema e settings |
| [accounts.md](.cursor/docs/accounts.md) | Multi-conta |
| [mercado-livre.md](.cursor/docs/mercado-livre.md) | Scraping ML e afiliado |
| [amazon.md](.cursor/docs/amazon.md) | Scraping Amazon e afiliado |
