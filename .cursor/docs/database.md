# Database — PostgreSQL + Prisma

## Schema

Tabela principal: `offers`

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
| score | int | Pontuação calculada |
| sent_at | datetime? | Quando foi publicado no WhatsApp |
| created_at | datetime | Quando foi coletado |

## Comandos

```bash
npm run migrate          # Aplica migrations em dev
npm run migrate:deploy   # Aplica em produção
npm run prisma:studio    # UI visual
```

## Repositories

- `offers/repository.ts` — único ponto de acesso ao Prisma para ofertas.
- Nunca chamar `prisma` diretamente de jobs ou módulos de infraestrutura externa.

## Regras

- `mercado_livre_id` é unique — impede duplicatas.
- `sent_at IS NULL` indica oferta pendente de envio.
- Migrations versionadas em `prisma/migrations/`.

## Docker

PostgreSQL exposto na porta `5432` via docker-compose. `DATABASE_URL` aponta para o serviço `postgres`.
