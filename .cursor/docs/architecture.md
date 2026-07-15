# Arquitetura

Sistema em processos separados, organizado por domínio. Integração com Mercado Livre via **scraping híbrido** (HTTP + Playwright) e **sessão de afiliado persistida**. Configuração runtime editável via painel **manager**.

## Estrutura

```
src/
├── app.ts              → collector (coleta + enfileira)
├── worker.ts           → WhatsApp + envio
├── ml-login.ts         → login afiliado ML (setup manual / CLI)
├── wa-login.ts         → login WhatsApp (CLI)
├── config/             → ENV (Zod) + stores de runtime
│   ├── env.ts
│   ├── score-config.ts
│   ├── brand-config.ts
│   ├── ml-sources-config.ts
│   └── queue-config-store.ts
├── whatsapp/           → Baileys + channel-cache
├── mercado-livre/      → scraping + sessão afiliado
├── offers/             → domínio de ofertas + message-template
├── jobs/               → workers BullMQ
├── queue/              → filas Redis + sender-schedule
├── database/           → Prisma
├── scripts/            → preflight, up
└── utils/              → logger, datetime, log-store

manager/                → painel web (MVC)
├── server.ts
├── routes/
├── controllers/
├── models/
└── views/
```

## Decisões arquiteturais

### Scraping híbrido vs API Oficial

| Camada | Estratégia |
|--------|------------|
| Coleta de produtos | HTTP (`fetch` + Cheerio/parser) como caminho principal |
| Coleta (fallback) | Playwright quando HTTP retorna bloqueio ou HTML vazio |
| Links de afiliado | HTTP `createLink` com cookies da sessão salva |
| Auth afiliado | Playwright com login manual (painel ou `npm run ml:login`) |
| Fallback de link | Playwright no link-builder → parâmetros `matt_tool`/`matt_word` |

**Motivos:** API oficial descartada; programa de afiliados não expõe API pública para links encurtados; sessão persistida espelha o padrão Baileys do WhatsApp.

### Config runtime (settings DB)

Parâmetros operacionais (score, intervalos, horários, template, brand, fontes ML) persistidos na tabela `settings`. Editáveis pelo manager; lidos com cache em memória nos processos `app`, `worker` e `manager`. Fallback para `QUEUE_CONFIG` e defaults em ENV.

### Processos separados

| Processo | Entry | Função |
|----------|-------|--------|
| Collector | `app.ts` | Coleta periódica + enfileiramento |
| Sender | `worker.ts` | Envio WhatsApp com janela operacional |
| Manager | `manager/server.ts` | Painel admin + conexões + controle do worker |
| ML Login | `ml-login.ts` | Setup manual de sessão afiliado (CLI) |

O `npm run up` sobe collector + manager. O worker é iniciado pelo painel para evitar conflito de sessão WhatsApp.

## Fluxo completo

```mermaid
flowchart TD
    A[Fontes ML — .env + settings] --> B{HTTP scrape}
    B -->|sucesso| C[parser.ts → RawOffer]
    B -->|403 / vazio| D[browser-scraper Playwright]
    D --> C
    C --> E[score-config + offers/service]
    E --> F{Sessão afiliado válida?}
    F -->|sim| G[HTTP createLink]
    F -->|não| H[fallback matt_tool ou login ML]
    G -->|falha| I[Playwright link-builder]
    G --> J[Link sec/...]
    I --> J
    J --> K{Deduplicação}
    K -->|nova| L[(PostgreSQL)]
    L --> M[offer-sender]
    M --> N[message-template + whatsapp/]
    O[manager/] -.->|edita settings + conexões| L
    O -.->|inicia worker| M
```

## Princípios

- HTTP primeiro, browser só quando necessário.
- Sessão de afiliado em disco (`./data/ml_auth/`), nunca hardcoded.
- Regras de negócio apenas em `offers/` e `config/score-config.ts`.
- Manager apenas orquestra UI — reutiliza `src/`.
- Um único processo mantém conexão WhatsApp ativa (worker).
- Playwright não roda em cada ciclo de coleta — apenas fallback.

## Documentação relacionada

- [Mercado Livre — Scraping](./mercado-livre.md)
- [Filas](./queues.md)
- [Database](./database.md)
- [WhatsApp](./whatsapp.md)
- [Manager](./manager.md)
- [Deployment](./deployment.md)
- [Implementation Board](../IMPLEMENTATION_BOARD.md)
