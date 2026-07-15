# Filas — Redis + BullMQ

Configuração em `src/queue/index.ts`. Agendamento de envio em `src/queue/sender-schedule.ts`.

## Filas

| Nome | Tipo | Processo | Descrição |
|------|------|----------|-----------|
| `offer-collector` | Repeatable | `app.ts` | Coleta periódica via scraping ML |
| `offer-sender` | Standard | `worker.ts` | Envio individual ao WhatsApp |

## Config runtime

Intervalos e horários lidos de `queue-config-store.ts` (tabela `settings` → cache → fallback `QUEUE_CONFIG` em ENV):

| Parâmetro | Default ENV | Editável no manager |
|-----------|-------------|---------------------|
| `collectorIntervalMinutes` | 15 | ✅ Settings |
| `senderDelayMinutes` | 15 | ✅ Settings |
| `operatingHoursStart` | 9 | ✅ Settings |
| `operatingHoursEnd` | 0 (24:00) | ✅ Settings |
| `searchLimit` | `ML_SEARCH_LIMIT` (50) | ✅ Ofertas |
| `affiliateLinkDelayMs` | 500 | ✅ Ofertas |
| `affiliateLinkBacklogDelayMinutes` | 2 | ✅ Ofertas |
| `affiliateLinkBacklogThreshold` | 5 | ✅ Ofertas |
| `minScore` | 50 | via score settings |
| `senderConcurrency` | 1 | apenas ENV |

## Fluxo

```
Fontes ML (.env + settings)
    ↓
jobs/collector
    ↓
mercado-livre/          → HTTP scrape → (Playwright fallback)
    ↓
score-config + offers/service → score, link afiliado, dedup
    ↓
PostgreSQL + offer-sender queue
    ↓
jobs/sender             → respeita janela operacional
    ↓
message-template + whatsapp/ → canal WhatsApp
```

## Collector (`offer-collector`)

1. Job repeatable dispara a cada `collectorIntervalMinutes`.
2. `searchConfiguredCategories()` — HTTP primeiro, Playwright se falhar.
3. `processOffers()` — score, gera link afiliado (async), deduplica, enfileira.
4. Retorna `{ total, enqueued }`.
5. Reagendamento via `rescheduleCollectorJob()` quando intervalo muda no manager.

## Sender (`offer-sender`)

1. Recebe `{ offerId }` da fila.
2. Verifica se oferta existe e `sent_at IS NULL`.
3. Gera link afiliado se ainda não existir.
4. Formata mensagem via `message-template` e publica via Baileys.
5. Marca `sent_at` e aplica delay entre envios.
6. Fora da janela operacional (`APP_TIMEZONE`): job fica delayed até horário válido.

## Desabilitar Redis

`REDIS_ENABLED=false` — collector e sender rodam inline (útil para dev sem Redis).

## Idempotência

`mercado_livre_id` unique + check de `sent_at` + dedup por title+price em ofertas já enviadas.
