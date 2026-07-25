# Contexto do Projeto

Bot automatizado: **Mercado Livre e Amazon → ofertas → canais (WhatsApp / Telegram)**, com painel admin web.

## Escopo

- Coletar produtos de categorias/URLs configuradas (ML e Amazon) via **scraping híbrido** (HTTP + Playwright fallback).
- Aplicar regras de negócio (score configurável, filtros, deduplicação, sorteio por canal).
- Gerar links de afiliado: ML encurtados com **sessão persistida** (estilo Baileys); Amazon com `?tag=` (config editável no painel).
- Publicar ofertas qualificadas em **um ou mais canais** (template editável).
- Enviar **cupons** e **mensagens automáticas** (bom dia, promoções) pelos canais.
- Gerenciar tudo via **manager** web (`/manager`): settings, conexões, contas, worker, logs.

**Fora de escopo:** API Oficial do Mercado Livre para coleta ou geração de links de afiliado.

## Decisão arquitetural

| Abordagem | Status |
|-----------|--------|
| Scraping híbrido (HTTP + Playwright) | ✅ Adotada |
| Sessão de afiliado persistida em arquivos locais | ✅ Adotada |
| Config runtime em tabela `settings` (editável pelo manager) | ✅ Adotada |
| Microsserviços: collector, scheduler, worker, manager | ✅ Adotada |
| Worker unificado de envio (WhatsApp + Telegram) | ✅ Adotada |
| Filas BullMQ separadas por canal/conta | ✅ Adotada |
| Contas em tabela Prisma `accounts` | ✅ Adotada |
| Multi-conta runtime (fila/sender/publisher por conta) | ✅ Adotada |
| Manager stateless em produção (Redis + `owner.lock`) | ✅ Adotada |
| Pool de filas BullMQ reutilizáveis | ✅ Adotada |
| API Oficial do Mercado Livre | ❌ Descartada |
| Worker separado por canal (`worker-telegram.ts`) | ❌ Descartada |

### Dois subsistemas no domínio `mercado-livre/`

1. **Coleta de produtos** — páginas públicas, sem login. HTTP primeiro; Playwright só em fallback. Paginação implementada. Circuit breaker em falhas repetidas.
2. **Links de afiliado** — requer sessão autenticada. HTTP com cookies salvos; Playwright para login e fallback de geração.
3. **Cupons** — scraping da página de cupons ML (`coupons.ts` + `coupon-parser.ts`), envio formatado pelos canais.

## Estrutura (por domínio)

`config/` · `accounts/` · `channels/` · `whatsapp/` · `telegram/` · `mercado-livre/` · `amazon/` · `affiliates/` · `sources/` · `offers/` · `auto-messages/` · `jobs/` · `queue/` · `database/` · `utils/` · `scripts/` · `manager/`

### Config runtime (`config/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `env.ts` | Variáveis de ambiente (Zod) |
| `score-config.ts` | Regras de pontuação (DB + fallback ENV) |
| `brand-config.ts` | Nome/logo do painel |
| `queue-config-store.ts` | Intervalos, horários, search limit, delays de afiliado |
| `ml-sources-config.ts` | Fontes ML por canal (.env + custom) |
| `amazon-sources-config.ts` | Fontes Amazon por canal (.env + custom) |
| `amazon-config-store.ts` | Links de afiliado Amazon (baseUrl, storeId, prefixo) |
| `coupons-config-store.ts` | URL da página de cupons ML |

### Domínio `accounts/`

Múltiplas contas por plataforma (WhatsApp, Telegram, ML). Persistência na tabela Prisma `accounts` com validação Zod de `config`. Conta `default` espelha o `.env`. O worker unificado carrega publishers via `loadAllWorkerPublishers()`.

### Domínio `channels/`

Contrato `ChannelPublisher`, publishers WhatsApp/Telegram, `publisher-factory.ts`, `worker-publisher.ts` e `worker-runner.ts` (`runUnifiedWorker` + heartbeat Redis).

### Utils compartilhados (`utils/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `logger.ts` | Pino centralizado |
| `log-store.ts` | Logs compartilhados via Redis (`radar:app-logs`) |
| `redis-state.ts` | Heartbeat de worker + QR/status WhatsApp no Redis |
| `datetime.ts` | Timezone e janela operacional |

### Módulo `mercado-livre/`

```
mercado-livre/
├── index.ts           → exports públicos (coleta)
├── parser.ts          → parse HTML/JSON embutido
├── http-scraper.ts    → coleta via fetch (principal, com paginação)
├── browser-scraper.ts → coleta via Playwright (fallback)
├── circuit-breaker.ts → proteção contra falhas repetidas
├── category-url.ts    → validação de categorias/URLs e paginação
├── session.ts         → persistência de sessão afiliado
├── affiliate-link.ts  → geração de link (cache → HTTP → browser → fallback)
├── auth.ts            → login manual via Playwright
├── coupons.ts         → scraping de cupons
└── coupon-parser.ts   → parse HTML/JSON de cupons
```

### Manager (`manager/`)

Painel MVC server-rendered: dashboard, ofertas, cupons, contas, fontes por canal, settings, template (ofertas + cupons + auto-messages), logs.

Em **produção/Docker**: manager é leitor de estado (Redis + `owner.lock`), não spawna workers (`MANAGER_CAN_SPAWN_WORKERS=false`).

## Fluxo da aplicação

```
Fontes ML + Amazon por canal (.env + settings) — roteamento em sources/routing.ts
        ↓
HTTP scrape — ou Playwright se bloqueado (com paginação)
        ↓
Parse HTML/JSON → RawOffer
        ↓
Score (score-config) + filtros + sorteio (offers/service)
        ↓
Geração de link afiliado — ML sob demanda no envio; Amazon via ?tag= (offers/affiliate-link.ts)
        ↓
Deduplicação (mercado_livre_id unique + title+price)
        ↓
Persistência + dispatchOffer (fan-out por canal × conta)
        ↓
Filas BullMQ (offer-sender / offer-sender-telegram / sufixo por accountId)
        ↓
worker.ts — runUnifiedWorker → ChannelPublisher (WhatsApp Baileys / Telegram Bot API)
```

## Processos (microsserviços)

| Entry | Comando | Função |
|-------|---------|--------|
| `app.ts` | `npm run dev` | Collector — agenda coleta, processa fila `offer-collector` |
| `scheduler.ts` | `npm run scheduler` | Agendador de mensagens automáticas (tick a cada 60s) |
| `worker.ts` | `npm run worker` | Sender unificado — WhatsApp + Telegram, todas as contas habilitadas |
| `ml-login.ts` | `npm run ml:login` | Login afiliado ML — salva sessão em `ML_AUTH_PATH` |
| `manager/server.ts` | `npm run manager` | Painel web em `/manager` |
| `scripts/up.ts` | `npm run up` | Sobe collector + scheduler + manager |

Worker em produção: serviço Docker `worker`. Em dev: spawn pelo painel (`MANAGER_CAN_SPAWN_WORKERS=true`) ou `npm run worker` no terminal.

## Integrações

| Sistema | Módulo | Protocolo |
|---------|--------|-----------|
| Mercado Livre (coleta) | `mercado-livre/http-scraper` | HTTP + parse HTML |
| Mercado Livre (afiliado) | `mercado-livre/affiliate-link` | HTTP + cookies / Playwright |
| Mercado Livre (cupons) | `mercado-livre/coupons` | HTTP + parse / Playwright |
| Amazon (coleta) | `amazon/http-scraper` | HTTP + parse HTML |
| Amazon (afiliado) | `amazon/affiliate-link` + `offers/affiliate-link` | URL com `?tag=` |
| PostgreSQL | `database/` + `offers/repository.ts` | Prisma ORM |
| Redis | `queue/` + `utils/log-store.ts` + `utils/redis-state.ts` | BullMQ + estado compartilhado |
| WhatsApp | `whatsapp/` + `channels/whatsapp-publisher` | Baileys |
| Telegram | `telegram/` + `channels/telegram-publisher` | Bot API (fetch) |

## Qualidade

- TypeScript `strict: true`; checagem de tipos via `npx tsc -p tsconfig.check.json` (inclui `src/` e `manager/`).
- CI GitHub Actions: `npm ci` → `tsc` → `npm test` (`.github/workflows/ci.yml`).
- ~28 arquivos de teste unitário (`node:test` + `assert`), incluindo Amazon e manager.

## Requisitos

- Node.js 20+ e TypeScript
- PostgreSQL 16, Redis 7
- Playwright + Chromium (`npm install` instala automaticamente)
- Conta aprovada no Programa de Afiliados ML
- Canal WhatsApp e/ou Telegram configurado

## Roadmap e débitos

Ver `.cursor/IMPLEMENTATION_BOARD.md` para status detalhado de tarefas.

**Débito principal (afiliado):** validar endpoint `createLink` real via DevTools e ajustar seletores do link-builder.
