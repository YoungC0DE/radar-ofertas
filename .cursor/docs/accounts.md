# Contas — multi-plataforma

Domínio `src/accounts/` + página `/manager/accounts`. Permite cadastrar múltiplas contas por plataforma (WhatsApp, Telegram, Mercado Livre).

## Domínio `src/accounts/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | `Account`, plataformas (`whatsapp` \| `telegram` \| `mercado_livre`), configs tipadas |
| `paths.ts` | `resolveAccountAuthPath(accountId, platform)` |
| `default-accounts.ts` | Conta `default` derivada do `.env` (compatibilidade) |
| `repository.ts` | Persistência em `settings.accounts` (JSON) com cache em memória |

### Persistência

Contas **não** têm model Prisma — vivem como JSON na chave `accounts` da tabela `settings`:

```json
[
  {
    "id": "minha-conta-wa",
    "platform": "whatsapp",
    "label": "Canal Principal",
    "enabled": true,
    "config": {
      "channelId": "120363...@newsletter",
      "authPath": "./data/accounts/minha-conta-wa/whatsapp"
    }
  }
]
```

A conta `default` usa os mesmos paths do `.env` (`WHATSAPP_AUTH_PATH`, `ML_AUTH_PATH`, `TELEGRAM_BOT_TOKEN`, etc.). Contas adicionais usam `data/accounts/{id}/{platform}/`.

## Manager — `/manager/accounts`

| Rota | Método | Função |
|------|--------|--------|
| `/manager/accounts` | GET | Lista contas por plataforma |
| `/manager/accounts/add` | POST | Adiciona conta |
| `/manager/accounts/:accountId/toggle` | POST | Ativa/desativa conta |
| `/manager/accounts/:accountId/delete` | POST | Remove conta |

Arquivos: `accounts-controller.ts`, `accounts-model.ts`, `views/accounts.ts`, `public/css/accounts.css`.

## Banco — `OfferDelivery.accountId`

A migration `20260723120000_add_account_id_to_deliveries` adicionou `account_id` em `offer_deliveries`:

- Unique: `(offer_id, channel, account_id)`
- Índice: `(account_id, channel, sent_at)`

`dispatchOffer` em `offers/service.ts` itera contas habilitadas por plataforma e abre uma entrega + enfileira job por `(canal, accountId)`.

## Filas por conta

`queue/index.ts` suporta filas nomeadas por conta:

```typescript
getSenderQueueName(channel, accountId)
// default → 'offer-sender' | 'offer-sender-telegram'
// outra   → 'offer-sender-{accountId}' | 'offer-sender-telegram-{accountId}'
```

Job id determinístico: `send-offer-{canal}-{accountId}-{offerId}` (ou sem accountId quando `default`).

## Status da feature (parcial)

| Peça | Status |
|------|--------|
| Tipos + repository + paths | ✅ |
| Página `/manager/accounts` | ✅ |
| `account_id` no schema + repository | ✅ |
| `dispatchOffer` fan-out por conta | ✅ |
| `senderJobId` com `accountId` | ✅ |
| `getSenderQueue(channel, accountId)` | ❌ `enqueueOfferSend` usa `getSenderQueue(channel)` sem accountId |
| `jobs/sender.ts` lê/marca delivery por conta | ❌ chama `findDelivery`/`markOfferDelivered` sem `accountId` |
| Worker por conta (`WORKER_ACCOUNT_ID` ou spawn no painel) | ❌ |
| Publishers/sessões parametrizados por conta | ❌ |

### Próximos passos

1. Passar `accountId` em `getSenderQueue` / `enqueueOfferSend` e no payload do job (`SenderJobData`).
2. `jobs/sender.ts`: ler `accountId` do job e usar em `findDelivery` / `markOfferDelivered`.
3. Workers parametrizados — um processo por conta WhatsApp (Baileys não escala horizontalmente na mesma sessão).
4. `whatsapp/index.ts` e `mercado-livre/session.ts` receberem `accountId` para resolver auth path da conta.

## Documentação relacionada

- [Canais](./channels.md)
- [Filas](./queues.md)
- [Database](./database.md)
- [Manager](./manager.md)
