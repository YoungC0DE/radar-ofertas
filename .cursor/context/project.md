# Contexto do Projeto

Bot automatizado: **Mercado Livre → ofertas → WhatsApp Channel**.

## Escopo

- Coletar produtos de categorias configuradas via **scraping híbrido** (HTTP + Playwright fallback).
- Aplicar regras de negócio (score, filtros, deduplicação).
- Gerar links de afiliado encurtados com **sessão persistida** (estilo Baileys).
- Publicar ofertas qualificadas em canal WhatsApp.

**Fora de escopo:** API Oficial do Mercado Livre para coleta ou geração de links de afiliado.

## Decisão arquitetural

| Abordagem | Status |
|-----------|--------|
| Scraping híbrido (HTTP + Playwright) | ✅ Adotada |
| Sessão de afiliado persistida em arquivos locais | ✅ Adotada |
| API Oficial do Mercado Livre | ❌ Descartada |

### Dois subsistemas no domínio `mercado-livre/`

1. **Coleta de produtos** — páginas públicas, sem login. HTTP primeiro; Playwright só em fallback.
2. **Links de afiliado** — requer sessão autenticada. HTTP com cookies salvos; Playwright para login (`ml:login`) e fallback de geração.

## Estrutura (por domínio)

`config/` · `whatsapp/` · `mercado-livre/` · `offers/` · `jobs/` · `queue/` · `database/` · `utils/`

### Módulo `mercado-livre/`

```
mercado-livre/
├── index.ts           → exports públicos
├── types.ts           → tipos internos
├── parser.ts          → parse HTML/JSON embutido
├── http-scraper.ts    → coleta via fetch (principal)
├── browser-scraper.ts → coleta via Playwright (fallback)
├── session.ts         → persistência de sessão afiliado
├── affiliate-link.ts  → geração de link (HTTP → browser → fallback)
└── auth.ts            → login manual via Playwright
```

Entry de login: `src/ml-login.ts` → `npm run ml:login`

## Fluxo da aplicação

```
Categorias configuradas (ML_CATEGORIES)
        ↓
HTTP scrape (lista.mercadolivre.com.br) — ou Playwright se bloqueado
        ↓
Parse HTML/JSON → RawOffer
        ↓
Aplicação das regras de negócio (offers/service)
        ↓
Cálculo de score das ofertas
        ↓
Geração de link afiliado (HTTP createLink com sessão / Playwright fallback)
        ↓
Remoção de ofertas repetidas (mercado_livre_id unique)
        ↓
Persistência + enfileiramento (PostgreSQL + BullMQ)
        ↓
Envio para o canal do WhatsApp (Baileys)
```

## Processos

| Entry | Função |
|-------|--------|
| `app.ts` | Collector — agenda coleta, processa fila `offer-collector` |
| `worker.ts` | Sender — conexão WhatsApp, processa fila `offer-sender` |
| `ml-login.ts` | Login afiliado ML — salva sessão em `ML_AUTH_PATH` |

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
