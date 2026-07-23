# Arquitetura

Sistema em processos separados, organizado por domínio. Integração com Mercado Livre via **scraping híbrido** (HTTP + Playwright) e **sessão de afiliado persistida**. Configuração runtime editável via painel **manager**.

## Estrutura

```
src/
├── app.ts              → collector (coleta + enfileira)
├── worker.ts           → envio WhatsApp
├── worker-telegram.ts  → envio Telegram
├── ml-login.ts         → login afiliado ML (setup manual / CLI)
├── wa-login.ts         → login WhatsApp (CLI)
├── config/             → ENV (Zod) + stores de runtime
│   ├── env.ts
│   ├── score-config.ts
│   ├── brand-config.ts
│   ├── ml-sources-config.ts
│   ├── queue-config-store.ts
│   └── coupons-config-store.ts
├── accounts/           → multi-conta (tabela Prisma `accounts`)
├── channels/           → contrato de canal + publishers + worker-runner
├── whatsapp/           → Baileys + channel-cache
├── telegram/           → Bot API (fetch)
├── mercado-livre/      → scraping + sessão afiliado + cupons
├── offers/             → domínio de ofertas + templates + cupons
├── auto-messages/      → mensagens automáticas agendadas
├── jobs/               → workers BullMQ (collector, sender genérico)
├── queue/              → filas Redis + sender-schedule
├── database/           → Prisma
├── scripts/            → preflight, up
└── utils/              → logger, datetime, log-store, redis-state, metrics

manager/                → painel web (MVC)
├── server.ts
├── http/               → router declarativo + helpers HTTP
├── routes/             → exporta handleManagerRequest
├── controllers/
├── models/
├── views/
└── public/             → CSS/JS estáticos
```

## Decisões arquiteturais

### Scraping híbrido vs API Oficial

| Camada | Estratégia |
|--------|------------|
| Coleta de produtos | HTTP (`fetch` + Cheerio/parser) como caminho principal |
| Coleta (fallback) | Playwright quando HTTP retorna bloqueio ou HTML vazio |
| Proteção anti-falha | Circuit breaker (`circuit-breaker.ts`) |
| Links de afiliado | HTTP `createLink` com cookies da sessão salva |
| Auth afiliado | Playwright com login manual (painel ou `npm run ml:login`) |
| Fallback de link | Playwright no link-builder → parâmetros `matt_tool`/`matt_word` |
| Cupons | HTTP + parse (`coupons.ts` / `coupon-parser.ts`) |

**Motivos:** API oficial descartada; programa de afiliados não expõe API pública para links encurtados; sessão persistida espelha o padrão Baileys do WhatsApp.

### Config runtime (settings DB)

Parâmetros operacionais (score, intervalos, horários, templates, brand, fontes ML, cupons, contas) persistidos na tabela `settings`. Editáveis pelo manager; lidos com cache em memória nos processos `app`, `worker` e `manager`. Fallback para `QUEUE_CONFIG` e defaults em ENV.

### Processos separados

| Processo | Entry | Função |
|----------|-------|--------|
| Collector | `app.ts` | Coleta periódica + enfileiramento (Playwright pooled) |
| Scheduler | `scheduler.ts` | Mensagens automáticas programadas (leve) |
| Sender WhatsApp | `worker.ts` | Envio WhatsApp com janela operacional |
| Sender Telegram | `worker-telegram.ts` | Envio Telegram com janela operacional |
| Manager | `manager/server.ts` | Painel admin — leitor de estado em produção |
| ML Login | `ml-login.ts` | Setup manual de sessão afiliado (CLI) |

O `npm run up` sobe collector + scheduler + manager. Em **dev** (`MANAGER_CAN_SPAWN_WORKERS=true`), o painel pode spawnar workers. Em **produção/Docker**, workers são serviços separados (`worker`, `worker-telegram`).

### Um canal, um processo

Cada canal de envio roda no seu próprio processo, com fila própria, e implementa o contrato `ChannelPublisher`. Falha isolada: uma queda do WhatsApp não impede o Telegram de publicar. O estado de envio é por `(canal, conta)` em `OfferDelivery` — ver [Canais](./channels.md).

### Multi-conta

Domínio `accounts/` + tabela Prisma `accounts` + `account_id` em `offer_deliveries` + fan-out em `dispatchOffer`. Runtime completo: fila, sender e publishers por `accountId` via `WORKER_ACCOUNT_ID`. Pendente: spawn de workers por conta no painel — ver [Contas](./accounts.md).

## Fluxo completo

```mermaid
flowchart TD
    A[Fontes ML por canal] --> B{HTTP scrape}
    B -->|sucesso| C[parser.ts → RawOffer]
    B -->|403 / vazio| D[browser-scraper Playwright]
    D --> C
    C --> E[score-config + offers/service]
    E --> F[dispatchOffer — fan-out canal × conta]
    F --> G[offer-sender → worker.ts]
    F --> H[offer-sender-telegram → worker-telegram.ts]
    G --> I[message-template + whatsapp/]
    H --> J[message-template + telegram/]
    K[manager/] -.->|edita settings + lê estado Redis| L[(PostgreSQL)]
    W[worker] -.->|heartbeat + QR| R[(Redis)]
    K -.->|lê estado| R
```

## Qualidade e CI

- TypeScript `strict: true`; `tsconfig.check.json` inclui `src/` e `manager/`.
- CI: `.github/workflows/ci.yml` — `npm ci` → `tsc` → `npm test`.
- 12 testes unitários (`node:test`); cobertura em parser, score, sampling, circuit-breaker, coupon-parser, account-config, redis-state.

## Princípios

- HTTP primeiro, browser só quando necessário.
- Sessão de afiliado em disco (`./data/ml_auth/`), nunca hardcoded.
- Regras de negócio apenas em `offers/`, `auto-messages/` e `config/score-config.ts`.
- Manager apenas orquestra UI — reutiliza `src/`.
- Um único processo mantém conexão WhatsApp ativa por sessão (worker + lock de dono + QR no Redis).
- Um canal, um processo — o envio de um canal nunca derruba o outro.
- Playwright não roda em cada ciclo de coleta — apenas fallback.

## Documentação relacionada

- [Mercado Livre — Scraping](./mercado-livre.md)
- [Filas](./queues.md)
- [Database](./database.md)
- [Canais de envio](./channels.md)
- [Contas](./accounts.md)
- [WhatsApp](./whatsapp.md)
- [Telegram](./telegram.md)
- [Manager](./manager.md)
- [Deployment](./deployment.md)
- [Implementation Board](../IMPLEMENTATION_BOARD.md)
