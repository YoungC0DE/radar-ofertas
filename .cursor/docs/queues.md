# Filas — Redis + BullMQ

Configuração em `src/queue/index.ts`. Agendamento de envio em `src/queue/sender-schedule.ts`.

## Filas

| Nome | Tipo | Processo | Descrição |
|------|------|----------|-----------|
| `offer-collector` | Repeatable | `app.ts` | Coleta periódica via scraping ML |
| `offer-sender` | Standard | `worker.ts` | Envio individual ao WhatsApp |
| `offer-sender-telegram` | Standard | `worker-telegram.ts` | Envio individual ao Telegram |

Uma fila por canal — cada worker tem seu ritmo e suas falhas isoladas. Ver [Canais](./channels.md).

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
PostgreSQL + dispatchOffer (fan-out por canal ligado)
    ↓                              ↓
offer-sender               offer-sender-telegram
    ↓                              ↓
jobs/sender (whatsapp)     jobs/sender (telegram)   → respeitam janela operacional
    ↓                              ↓
canal WhatsApp                canal Telegram
```

## Collector (`offer-collector`)

1. Job repeatable dispara a cada `collectorIntervalMinutes`.
2. `searchConfiguredCategories()` — HTTP primeiro, Playwright se falhar.
3. `processOffers()` — score, gera link afiliado (async), deduplica, enfileira.
4. Retorna `{ total, enqueued }`.
5. Reagendamento via `rescheduleCollectorJob()` quando intervalo muda no manager.

## Sender (um por canal)

O mesmo código (`jobs/sender.ts`) roda para todos os canais — muda só o `ChannelPublisher`:

1. Recebe `{ offerId }` da fila **daquele canal**.
2. Verifica se a oferta existe e se a entrega **deste canal** ainda não foi concluída.
3. Gera link afiliado se ainda não existir.
4. Formata mensagem via `message-template` e publica pelo publisher do canal.
5. Fecha a `OfferDelivery` com `sent_at` + `message_id` e aplica delay entre envios.
6. Fora da janela operacional (`APP_TIMEZONE`): job fica delayed até horário válido.
7. Em falha, grava o motivo na entrega e repropaga — o BullMQ retenta (5x, backoff).

## Desabilitar Redis

`REDIS_ENABLED=false` — collector e sender rodam inline (útil para dev sem Redis).

## Idempotência

`mercado_livre_id` unique + dedup por title+price em ofertas já enviadas + `OfferDelivery` unique em `(offer_id, channel)`. O job id `send-offer-{canal}-{offerId}` garante um envio por oferta por canal.
