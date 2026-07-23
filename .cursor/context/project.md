# Contexto do Projeto

Bot automatizado: **Mercado Livre → ofertas → canais (WhatsApp / Telegram)**, com painel admin web.

## Escopo

- Coletar produtos de categorias/URLs configuradas via **scraping híbrido** (HTTP + Playwright fallback).
- Aplicar regras de negócio (score configurável, filtros, deduplicação, sorteio por canal).
- Gerar links de afiliado encurtados com **sessão persistida** (estilo Baileys).
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
| Um canal = um processo = uma fila BullMQ | ✅ Adotada |
| Worker gerenciado pelo painel (evita conflito WhatsApp) | ✅ Adotada |
| Multi-conta por plataforma | 🟡 Parcial (schema + UI + dispatch; worker ainda usa `default`) |
| API Oficial do Mercado Livre | ❌ Descartada |

### Dois subsistemas no domínio `mercado-livre/`

1. **Coleta de produtos** — páginas públicas, sem login. HTTP primeiro; Playwright só em fallback. Paginação implementada. Circuit breaker em falhas repetidas.
2. **Links de afiliado** — requer sessão autenticada. HTTP com cookies salvos; Playwright para login e fallback de geração.
3. **Cupons** — scraping da página de cupons ML (`coupons.ts` + `coupon-parser.ts`), envio formatado pelos canais.

## Estrutura (por domínio)

`config/` · `accounts/` · `channels/` · `whatsapp/` · `telegram/` · `mercado-livre/` · `offers/` · `auto-messages/` · `jobs/` · `queue/` · `database/` · `utils/` · `scripts/` · `manager/`

### Config runtime (`config/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `env.ts` | Variáveis de ambiente (Zod) |
| `score-config.ts` | Regras de pontuação (DB + fallback ENV) |
| `brand-config.ts` | Nome/logo do painel |
| `queue-config-store.ts` | Intervalos, horários, search limit, delays de afiliado |
| `ml-sources-config.ts` | Fontes de coleta por canal (.env + custom) |
| `coupons-config-store.ts` | URL da página de cupons ML |

### Domínio `accounts/`

Preparação para múltiplas contas por plataforma (WhatsApp, Telegram, ML). Persistência em `settings.accounts` (JSON). Conta `default` espelha o `.env`.

### Domínio `channels/`

Contrato `ChannelPublisher`, publishers WhatsApp/Telegram, factory e `worker-runner.ts` compartilhado.

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

## Fluxo da aplicação

```
Fontes ML por canal (.env + settings)
        ↓
HTTP scrape — ou Playwright se bloqueado (com paginação)
        ↓
Parse HTML/JSON → RawOffer
        ↓
Score (score-config) + filtros + sorteio (offers/service)
        ↓
Geração de link afiliado (sob demanda no envio ou na coleta)
        ↓
Deduplicação (mercado_livre_id unique + title+price)
        ↓
Persistência + dispatchOffer (fan-out por canal × conta)
        ↓
Filas BullMQ (offer-sender / offer-sender-telegram)
        ↓
Envio via ChannelPublisher (WhatsApp Baileys / Telegram Bot API)
```

## Processos

| Entry | Comando | Função |
|-------|---------|--------|
| `app.ts` | `npm run dev` | Collector — agenda coleta, processa fila `offer-collector` |
| `worker.ts` | `npm run worker` | Sender WhatsApp — fila `offer-sender` |
| `worker-telegram.ts` | `npm run worker:telegram` | Sender Telegram — fila `offer-sender-telegram` |
| `ml-login.ts` | `npm run ml:login` | Login afiliado ML — salva sessão em `ML_AUTH_PATH` |
| `manager/server.ts` | `npm run manager` | Painel web em `/manager` |
| `scripts/up.ts` | `npm run up` | Sobe collector + manager (workers via painel) |

## Integrações

| Sistema | Módulo | Protocolo |
|---------|--------|-----------|
| Mercado Livre (coleta) | `mercado-livre/http-scraper` | HTTP + parse HTML |
| Mercado Livre (afiliado) | `mercado-livre/affiliate-link` | HTTP + cookies / Playwright |
| Mercado Livre (cupons) | `mercado-livre/coupons` | HTTP + parse / Playwright |
| PostgreSQL | `database/` + `offers/repository.ts` | Prisma ORM |
| Redis | `queue/` | BullMQ |
| WhatsApp | `whatsapp/` + `channels/whatsapp-publisher` | Baileys |
| Telegram | `telegram/` + `channels/telegram-publisher` | Bot API (fetch) |

## Qualidade

- TypeScript `strict: true`; checagem de tipos via `npx tsc -p tsconfig.check.json` (inclui `src/` e `manager/`).
- CI GitHub Actions: `npm ci` → `tsc` → `npm test` (`.github/workflows/ci.yml`).
- 10 arquivos de teste unitário (`node:test` + `assert`).

## Requisitos

- Node.js 20+ e TypeScript
- PostgreSQL 16, Redis 7
- Playwright + Chromium (`npm install` instala automaticamente)
- Conta aprovada no Programa de Afiliados ML
- Canal WhatsApp e/ou Telegram configurado

## Roadmap e débitos

Ver `.cursor/IMPLEMENTATION_BOARD.md` para status detalhado de tarefas.

**Débito principal:** multi-conta incompleto — `dispatchOffer` enfileira com `accountId`, mas `getSenderQueue(channel)` e `jobs/sender.ts` ainda operam na conta `default`.
