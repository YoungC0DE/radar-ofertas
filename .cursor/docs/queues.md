# Filas — Redis + BullMQ

Configuração em `src/queue/index.ts`. Agendamento de envio em `src/queue/sender-schedule.ts`.

## Filas

| Nome | Tipo | Processo | Descrição |
|------|------|----------|-----------|
| `offer-collector` | Repeatable | `app.ts` | Coleta periódica via scraping ML |
| `offer-sender` | Standard | `worker.ts` | Envio WhatsApp (conta `default`) |
| `offer-sender-telegram` | Standard | `worker-telegram.ts` | Envio Telegram (conta `default`) |
| `offer-sender-{accountId}` | Standard | `worker.ts` | Fila por conta WhatsApp não-default |
| `offer-sender-telegram-{accountId}` | Standard | `worker-telegram.ts` | Fila por conta Telegram não-default |

Uma fila por canal e por conta. Cada worker tem seu ritmo e suas falhas isoladas. Ver [Canais](./channels.md).

## Pool de filas

Instâncias `Queue` são reutilizadas via `getQueue(name)` — cache em memória com `closeAllQueues()` no shutdown. Evita overhead de criar/fechar conexão a cada `enqueue*`.

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
Fontes ML por canal (.env + settings)
    ↓
jobs/collector (+ auto-messages due)
    ↓
mercado-livre/          → HTTP scrape → (Playwright fallback)
    ↓
score-config + offers/service → score, dedup, dispatchOffer
    ↓
PostgreSQL + fan-out (canal × conta)
    ↓                              ↓
offer-sender               offer-sender-telegram
    ↓                              ↓
jobs/sender (whatsapp)     jobs/sender (telegram)   → janela operacional
    ↓                              ↓
canal WhatsApp                canal Telegram
```

## Collector (`offer-collector`)

1. Job repeatable dispara a cada `collectorIntervalMinutes`.
2. `collectNewOffers()` — coleta independente por canal, até `searchLimit` por canal.
3. `processOffers()` — score, deduplica, `dispatchOffer`.
4. Processa auto-messages due (`auto-messages/service.ts`).
5. Retorna `{ total, enqueued }`.
6. Reagendamento via `rescheduleCollectorJob()` quando intervalo muda no manager.

## Sender (um por canal)

O mesmo código (`jobs/sender.ts`) roda para todos os canais — muda só o `ChannelPublisher`. Tipos de job no payload:

| Campo | Uso |
|-------|-----|
| `offerId` | Envio de oferta |
| `accountId` | Conta de envio (default: `'default'`) |
| `autoMessageId` | Mensagem automática agendada |
| `text` | Texto livre (cupons, envio manual) |
| `force` | Ignora pacing/janela |

Fluxo de oferta:

1. Recebe `{ offerId, accountId? }` da fila **daquele canal e conta**.
2. Verifica se a oferta existe e se a entrega **deste canal e conta** ainda não foi concluída.
3. Gera link afiliado sob demanda se ainda não existir (timeout 10s, sem browser).
4. Formata mensagem via `message-template` e publica pelo publisher do canal.
5. Fecha a `OfferDelivery` com `sent_at` + `message_id` e aplica delay entre envios.
6. Fora da janela operacional (`APP_TIMEZONE`): job fica delayed até horário válido.
7. Em falha, grava o motivo na entrega e repropaga — o BullMQ retenta (5x, backoff exponencial 30s).

### Retry

```typescript
SENDER_JOB_OPTIONS = { attempts: 5, backoff: { type: 'exponential', delay: 30_000 } }
```

## Job IDs determinísticos

| Tipo | Padrão |
|------|--------|
| Oferta (default) | `send-offer-{canal}-{offerId}` |
| Oferta (conta) | `send-offer-{canal}-{accountId}-{offerId}` |
| Auto-message | `send-auto-message-{canal}-{autoMessageId}-{suffix}` |
| Texto livre | `send-text-{canal}-{suffix}` |

## Multi-conta

`dispatchOffer` enfileira com `accountId` via `getSenderQueue(channel, accountId)`. O sender lê `accountId` do job e usa em `findDelivery` / `markOfferDelivered`. Worker consome conta via `WORKER_ACCOUNT_ID`. Ver [Contas](./accounts.md).

## Estado compartilhado no Redis

Além das filas BullMQ, o Redis armazena:

| Chave | Uso |
|-------|-----|
| `radar:app-logs` | Logs compartilhados (`log-store.ts`) |
| `radar:worker:{channel}:{accountId}` | Heartbeat do worker (TTL 30s) |
| `radar:connect:wa:{accountId}` | QR/status WhatsApp (TTL 120s) |

Ver `src/utils/redis-state.ts` e [Manager](./manager.md).

## Desabilitar Redis

`REDIS_ENABLED=false` — collector e sender rodam inline (útil para dev sem Redis). QR no painel não funciona sem Redis.

## Idempotência

- `mercado_livre_id` unique + dedup por title+price em ofertas já enviadas.
- `OfferDelivery` unique em `(offer_id, channel, account_id)`.
- Entrega aberta **antes** de enfileirar (`openOfferDelivery` em `dispatchOffer`).
- Job id determinístico garante um envio por oferta por canal por conta.
