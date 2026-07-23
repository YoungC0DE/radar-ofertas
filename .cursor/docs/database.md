# Database — PostgreSQL + Prisma

## Schema

### Tabela `offers`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| mercado_livre_id | string (unique) | ID do produto no ML — controle de duplicidade |
| title | string | Nome do produto |
| price | decimal | Preço atual |
| old_price | decimal? | Preço original |
| discount | int? | Percentual de desconto |
| image | string? | URL da imagem |
| permalink | string? | URL canônica do produto no ML |
| affiliate_link | string? | Link de afiliado gerado |
| rating | float? | Avaliação do produto |
| sold_quantity | int? | Quantidade vendida |
| sales_rank | string? | Ranking de vendas (ex: "4º em Impressoras") |
| seller | string? | Nome do vendedor |
| official_store | boolean | Loja oficial |
| best_seller | boolean | Destaque "mais vendido" |
| score | int | Pontuação calculada |
| sent_at | datetime? | Primeiro envio em **qualquer** canal (denormalizado de `offer_deliveries`) |
| created_at | datetime | Quando foi coletado |

### Tabela `offer_deliveries`

Uma linha por `(oferta, canal, conta)` — fonte da verdade de quem já recebeu o quê.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| offer_id | string | FK → `offers.id` (`ON DELETE CASCADE`) |
| channel | string | `whatsapp` \| `telegram` |
| account_id | string | Conta de envio (default: `'default'`) |
| sent_at | datetime? | Quando publicou; nulo = ainda pendente |
| message_id | string? | ID da mensagem no canal |
| error | string? | Motivo da última falha (o BullMQ ainda retenta) |
| created_at | datetime | Quando foi enfileirada |

Unique em `(offer_id, channel, account_id)`. Índices em `(channel, sent_at)` e `(account_id, channel, sent_at)`.

Ver [Canais](./channels.md) e [Contas](./accounts.md).

### Tabela `auto_messages`

Mensagens automáticas independentes de ofertas (bom dia, códigos promocionais, etc.).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | cuid | PK |
| title | string | Título interno |
| content | string | Texto (suporta `{{store}}` e placeholders de brand) |
| schedule_type | string | `manual` \| `once` \| `daily` |
| scheduled_at | datetime? | Para `once` — data/hora única |
| daily_hour | int? | Para `daily` — hora (0–23) |
| daily_minute | int? | Para `daily` — minuto (default 0) |
| enabled | boolean | Ativa/desativa |
| last_sent_at | datetime? | Último envio bem-sucedido |
| created_at / updated_at | datetime | Auditoria |

Gerenciadas em `/manager/template` (seção auto-messages). Lógica em `src/auto-messages/`.

### Tabela `accounts`

Contas de envio e sessão (WhatsApp, Telegram, Mercado Livre afiliado).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | string | PK — ex: `default`, `whatsapp-abc123` |
| platform | string | `whatsapp` \| `telegram` \| `mercado_livre` |
| label | string | Nome exibido no painel |
| enabled | boolean | Conta ativa |
| config | json | Config por plataforma (validado com Zod) |
| created_at | datetime | Quando foi criada |

Índice em `(platform, enabled)`. Migration `20260723140000_add_accounts_table` migra JSON legado de `settings.accounts`.

### Tabela `settings` (key-value)

Configuração runtime editável pelo manager. Chave primária: `key` (string).

| Chave | Conteúdo |
|-------|----------|
| `scoreConfig` | JSON — regras de pontuação |
| `brandSettings` | JSON — nome, subtítulo, logo |
| `messageTemplate` | String — template de ofertas com placeholders |
| `messageTemplatePlaceholders` | JSON — visibilidade dos placeholders |
| `couponMessageTemplate` | String — template de cupons |
| `whatsappChannelCache` | JSON — nome e invite link do canal |
| `senderDelayMinutes` | Int — intervalo entre envios |
| `collectorIntervalMinutes` | Int — intervalo de coleta |
| `operatingHoursStart` | Int — hora início janela (0–23) |
| `operatingHoursEnd` | Int — hora fim janela (0 = 24:00) |
| `searchLimit` | Int — limite de produtos por coleta (por canal) |
| `affiliateLinkDelayMs` | Int — delay entre gerações de link afiliado |
| `affiliateLinkBacklogDelayMinutes` | Int — backoff quando há backlog |
| `affiliateLinkBacklogThreshold` | Int — quantidade de pendentes para ativar backoff |
| `mlCustomSources` | JSON — URLs customizadas de coleta por canal |
| `mlEnvSourceFlags` | JSON — ativar/desativar categorias do `.env` por canal |
| `couponsUrl` | String — URL da página de cupons ML |

> **Legado:** contas viviam em `settings.accounts` (JSON). Migradas para a tabela `accounts` na migration `20260723140000`.

## Chaves Redis (além do BullMQ)

| Chave | Tipo | Uso |
|-------|------|-----|
| `radar:app-logs` | LIST | Logs compartilhados (`log-store.ts`) |
| `radar:ml-scrape-count` | STRING | Contador de visitas ML |
| `radar:worker:{channel}:{accountId}` | HASH | Heartbeat do worker (TTL 30s) |
| `radar:connect:wa:{accountId}` | HASH | QR/status WhatsApp (TTL 120s) |

Ver `src/utils/redis-state.ts` e [Manager](./manager.md).

## Comandos

```bash
npm run migrate          # Aplica migrations em dev
npm run migrate:deploy   # Aplica em produção
npx prisma studio        # UI visual (não há script npm dedicado)
```

## Acesso ao banco

| Domínio | Módulo |
|---------|--------|
| Ofertas e entregas | `offers/repository.ts` |
| Auto-messages | `auto-messages/repository.ts` |
| Settings (score, brand, filas, template) | `config/*-config*.ts`, `queue-config-store.ts`, `offers/message-template.ts`, `whatsapp/channel-cache.ts` |
| Contas | `accounts/repository.ts` |
| Estado Redis (heartbeat, QR) | `utils/redis-state.ts` |
| Fontes ML | `config/ml-sources-config.ts` |
| Cupons (URL) | `config/coupons-config-store.ts` |

Nunca chamar `prisma` diretamente de jobs ou módulos de scraping.

## Regras

- `mercado_livre_id` é unique — impede duplicatas.
- `offers.sent_at IS NULL` indica oferta ainda não publicada em nenhum canal — use apenas para dedup e visões globais.
- Estado **por canal e conta** vem sempre de `offer_deliveries`, nunca de `offers.sent_at`.
- Settings: upsert por chave; cache em memória hidratado no startup.
- Migrations versionadas em `prisma/migrations/`.

## Docker

PostgreSQL exposto na porta `5432` via docker-compose. `DATABASE_URL` aponta para o serviço `postgres`.
