# Contas — multi-plataforma

Domínio `src/accounts/` + página `/manager/accounts`. Permite cadastrar múltiplas contas por plataforma (WhatsApp, Telegram, Mercado Livre).

## Domínio `src/accounts/`

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | `Account`, plataformas (`whatsapp` \| `telegram` \| `mercado_livre`), configs tipadas |
| `paths.ts` | `resolveAccountAuthPath(accountId, platform)` |
| `default-accounts.ts` | Conta `default` derivada do `.env` (compatibilidade) |
| `account-config.ts` | Validação Zod de `config` por plataforma |
| `repository.ts` | Persistência na tabela `accounts` (Prisma) com cache em memória |
| `worker-publisher.ts` | Carrega publisher da conta via `WORKER_ACCOUNT_ID` |
| `channel-accounts.ts` | `getEnabledAccountIdsForChannel()` |

### Persistência

Contas vivem na tabela Prisma `accounts` (`id`, `platform`, `label`, `enabled`, `config` JSON, `created_at`).

A migration `20260723140000_add_accounts_table` migra automaticamente o JSON legado de `settings.accounts` (se existir) e remove a chave antiga.

Se a tabela estiver vazia no primeiro `loadAccounts()`, o repository faz seed com `buildDefaultAccountsFromEnv()`.

`config` é validado com Zod em `account-config.ts` ao ler/gravar:

| Plataforma | Campos em `config` |
|------------|-------------------|
| `whatsapp` | `channelId`, `authPath`, `channelName?`, `inviteLink?` |
| `telegram` | `botToken`, `chatId` |
| `mercado_livre` | `authPath` |

Exemplo de linha:

```json
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

## Status da feature

| Peça | Status |
|------|--------|
| Tipos + repository + paths + validação Zod | ✅ |
| Tabela `accounts` (Prisma) + migration de dados | ✅ |
| Página `/manager/accounts` | ✅ |
| `account_id` no schema + repository | ✅ |
| `dispatchOffer` fan-out por conta | ✅ |
| `enqueueOfferSend` com fila por `accountId` | ✅ |
| `jobs/sender.ts` delivery por conta | ✅ |
| Worker por conta (`WORKER_ACCOUNT_ID`) | ✅ |
| Publishers/sessões parametrizados por conta | ✅ |
| Painel spawna workers com `WORKER_ACCOUNT_ID` | ✅ |

### Spawn pelo painel

Com `MANAGER_CAN_SPAWN_WORKERS=true` (dev local), Settings → Operações exibe **um card de worker por conta habilitada**. Cada spawn define `WORKER_ACCOUNT_ID` no processo filho. Em Docker/produção (`MANAGER_CAN_SPAWN_WORKERS=false`), use `docker-compose.accounts.example.yml` ou `WORKER_ACCOUNT_ID=x npm run worker`.

## Documentação relacionada

- [Canais](./channels.md)
- [Filas](./queues.md)
- [Database](./database.md)
- [Manager](./manager.md)
