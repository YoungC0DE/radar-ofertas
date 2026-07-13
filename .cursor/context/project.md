# Contexto do Projeto

Bot automatizado: **Mercado Livre → ofertas → WhatsApp Channel**, com painel admin web.

## Escopo

- Coletar produtos de categorias configuradas via **scraping híbrido** (HTTP + Playwright fallback).
- Aplicar regras de negócio (score configurável, filtros, deduplicação).
- Gerar links de afiliado encurtados com **sessão persistida** (estilo Baileys).
- Publicar ofertas qualificadas em canal WhatsApp (template editável).
- Gerenciar tudo via **manager** web (`/manager`).

**Fora de escopo:** API Oficial do Mercado Livre para coleta ou geração de links de afiliado.

## Decisão arquitetural

| Abordagem | Status |
|-----------|--------|
| Scraping híbrido (HTTP + Playwright) | ✅ Adotada |
| Sessão de afiliado persistida em arquivos locais | ✅ Adotada |
| Config runtime em tabela `settings` (editável pelo manager) | ✅ Adotada |
| API Oficial do Mercado Livre | ❌ Descartada |

### Dois subsistemas no domínio `mercado-livre/`

1. **Coleta de produtos** — páginas públicas, sem login. HTTP primeiro; Playwright só em fallback.
2. **Links de afiliado** — requer sessão autenticada. HTTP com cookies salvos; Playwright para login (`ml:login`) e fallback de geração.

## Estrutura (por domínio)

`config/` · `whatsapp/` · `mercado-livre/` · `offers/` · `jobs/` · `queue/` · `database/` · `utils/` · `scripts/` · `manager/`

### Config runtime (`config/`)

| Arquivo | Responsabilidade |
|---------|------------------|
| `env.ts` | Variáveis de ambiente (Zod) |
| `score-config.ts` | Regras de pontuação (DB + fallback ENV) |
| `brand-config.ts` | Nome/logo do painel |
| `queue-config-store.ts` | Intervalos, horários, search limit |

### Módulo `mercado-livre/`

```
mercado-livre/
├── index.ts           → exports públicos
├── types.ts           → tipos internos
├── parser.ts          → parse HTML/JSON embutido
├── http-scraper.ts    → coleta via fetch (principal)
├── browser-scraper.ts → coleta via Playwright (fallback)
├── category-url.ts    → validação de categorias/URLs
├── session.ts         → persistência de sessão afiliado
├── affiliate-link.ts  → geração de link (HTTP → browser → fallback)
└── auth.ts            → login manual via Playwright
```

### Manager (`manager/`)

Painel MVC server-rendered: dashboard, ofertas, settings, template WhatsApp.

## Fluxo da aplicação

```
Categorias configuradas (ML_CATEGORIES)
        ↓
HTTP scrape — ou Playwright se bloqueado
        ↓
Parse HTML/JSON → RawOffer
        ↓
Score (score-config) + filtros (offers/service)
        ↓
Geração de link afiliado (HTTP createLink / Playwright fallback)
        ↓
Deduplicação (mercado_livre_id unique + title+price)
        ↓
Persistência + enfileiramento (PostgreSQL + BullMQ)
        ↓
Envio para canal WhatsApp (template + Baileys)
```

## Processos

| Entry | Comando | Função |
|-------|---------|--------|
| `app.ts` | `npm run dev` | Collector — agenda coleta, processa fila `offer-collector` |
| `worker.ts` | `npm run worker` | Sender — conexão WhatsApp, processa fila `offer-sender` |
| `ml-login.ts` | `npm run ml:login` | Login afiliado ML — salva sessão em `ML_AUTH_PATH` |
| `manager/server.ts` | `npm run manager` | Painel web em `/manager` |
| `scripts/up.ts` | `npm run up` | Sobe collector + worker + manager localmente |

## Integrações

| Sistema | Módulo | Protocolo |
|---------|--------|-----------|
| Mercado Livre (coleta) | `mercado-livre/http-scraper` | HTTP + parse HTML |
| Mercado Livre (afiliado) | `mercado-livre/affiliate-link` | HTTP + cookies / Playwright |
| PostgreSQL | `database/` + `offers/repository.ts` | Prisma ORM |
| Redis | `queue/` | BullMQ |
| WhatsApp | `whatsapp/` | Baileys |

## Requisitos

- Node.js + TypeScript
- PostgreSQL 16, Redis 7
- Playwright + Chromium (`npm install` instala automaticamente)
- Conta aprovada no Programa de Afiliados ML
- Canal WhatsApp configurado

## Roadmap

Ver `.cursor/IMPLEMENTATION_BOARD.md` para status detalhado de tarefas.
