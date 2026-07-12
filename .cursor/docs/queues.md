# Filas — Redis + BullMQ

Tudo em `src/queue/index.ts`.

## Filas

| Nome | Tipo | Processo | Descrição |
|------|------|----------|-----------|
| `offer-collector` | Repeatable | `app.ts` | Coleta periódica via scraping ML (default: 15 min) |
| `offer-sender` | Standard | `worker.ts` | Envio individual ao WhatsApp |

## Fluxo

```
Categorias (ML_CATEGORIES)
    ↓
jobs/collector
    ↓
mercado-livre/          → HTTP scrape → (Playwright fallback)
    ↓
offers/service          → score, link afiliado, dedup
    ↓
PostgreSQL + offer-sender queue
    ↓
jobs/sender
    ↓
whatsapp/               → canal WhatsApp
```

## Collector (`offer-collector`)

1. Job repeatable dispara a cada `collectorIntervalMinutes`.
2. `searchConfiguredCategories()` — HTTP primeiro, Playwright se falhar.
3. `processOffers()` — score, gera link afiliado (async), deduplica, enfileira.
4. Retorna `{ total, enqueued }`.

**Nota:** geração de link afiliado por produto pode aumentar tempo do job — considerar rate limit futuro.

## Sender (`offer-sender`)

1. Recebe `{ offerId }` da fila.
2. Verifica se oferta existe e `sent_at IS NULL`.
3. Formata mensagem e publica via Baileys.
4. Marca `sent_at` e aplica delay entre envios.

## Configuração (QUEUE_CONFIG)

Ver `.env.example`. Idempotência via `mercado_livre_id` unique e check de `sent_at`.
