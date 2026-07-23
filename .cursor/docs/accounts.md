# Arquitetura — contas e manager

## Domínio `src/accounts/`

Preparação para múltiplas contas por plataforma (WhatsApp, Telegram, ML).

| Arquivo | Responsabilidade |
|---------|------------------|
| `types.ts` | `Account`, plataformas, configs tipadas |
| `paths.ts` | `resolveAccountAuthPath(accountId, platform)` |
| `default-accounts.ts` | Conta `default` derivada do `.env` (compat) |
| `repository.ts` | Persistência em `settings.accounts` (JSON) |

A conta `default` usa os mesmos paths do `.env` (`WHATSAPP_AUTH_PATH`, `ML_AUTH_PATH`). Contas adicionais usam `data/accounts/{id}/{platform}/`.

## Próximos passos para multi-conta

1. Migration: `account_id` em `OfferDelivery` e filas por conta
2. Workers parametrizados (`WORKER_ACCOUNT_ID` ou spawn por conta no painel)
3. Página `/manager/accounts` no painel
4. `whatsapp/index.ts` e `mercado-livre/session.ts` recebem `accountId` em vez de ler só ENV

## Manager reorganizado

- Rotas declarativas em `manager/http/routes/` (SRP por domínio)
- `createRouter()` em `manager/http/request.ts` (Open/Closed — nova rota = nova entrada no array)
- Views de settings em `manager/views/settings/sections/`
- Componentes em `manager/views/components/`
