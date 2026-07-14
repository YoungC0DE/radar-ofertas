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
| affiliate_link | string? | Link de afiliado gerado |
| rating | float? | Avaliação do produto |
| sold_quantity | int? | Quantidade vendida |
| sales_rank | string? | Ranking de vendas (ex: "4º em Impressoras") |
| score | int | Pontuação calculada |
| sent_at | datetime? | Quando foi publicado no WhatsApp |
| created_at | datetime | Quando foi coletado |

### Tabela `settings` (key-value)

Configuração runtime editável pelo manager. Chave primária: `key` (string).

| Chave | Conteúdo |
|-------|----------|
| `scoreConfig` | JSON — regras de pontuação |
| `brandSettings` | JSON — nome, subtítulo, logo |
| `messageTemplate` | String — template WhatsApp com placeholders |
| `messageTemplatePlaceholders` | JSON — visibilidade dos placeholders |
| `whatsappChannelCache` | JSON — nome e invite link do canal |
| `senderDelayMinutes` | Int — intervalo entre envios |
| `collectorIntervalMinutes` | Int — intervalo de coleta |
| `operatingHoursStart` | Int — hora início janela (0–23) |
| `operatingHoursEnd` | Int — hora fim janela (0 = 24:00) |
| `searchLimit` | Int — limite de produtos por coleta |

## Comandos

```bash
npm run migrate          # Aplica migrations em dev
npm run migrate:deploy   # Aplica em produção
npm run prisma:studio    # UI visual
```

## Acesso ao banco

| Domínio | Módulo |
|---------|--------|
| Ofertas | `offers/repository.ts` |
| Settings (score, brand, filas, template) | `config/*-config*.ts`, `queue-config-store.ts`, `offers/message-template.ts`, `whatsapp/channel-cache.ts` |

Nunca chamar `prisma` diretamente de jobs ou módulos de scraping.

## Regras

- `mercado_livre_id` é unique — impede duplicatas.
- `sent_at IS NULL` indica oferta pendente de envio.
- Settings: upsert por chave; cache em memória hidratado no startup.
- Migrations versionadas em `prisma/migrations/`.

## Docker

PostgreSQL exposto na porta `5432` via docker-compose. `DATABASE_URL` aponta para o serviço `postgres`.
