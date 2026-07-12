# Deployment — Docker

## Serviços (docker-compose)

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| postgres | postgres:16-alpine | 5432 | Banco de dados |
| redis | redis:7-alpine | 6379 | Filas BullMQ |
| app | build local (bookworm + Chromium) | — | Collector (scraping + enfileira) |
| worker | build local | — | WhatsApp + envio |

## Primeiro deploy

```bash
cp .env.example .env
# Editar .env com valores reais

docker compose up -d postgres redis
npm run migrate
docker compose up -d
```

## Autenticação WhatsApp

1. Subir worker: `docker compose logs -f worker`
2. Escanear QR code exibido no terminal.
3. Sessão persistida em volume `whatsapp_auth` → `./data/auth_info_baileys`.

## Autenticação Mercado Livre (afiliado)

Executar **no host** (navegador visível):

```bash
npm run ml:login
```

1. Navegador abre o portal de afiliados.
2. Faça login manualmente.
3. Quando estiver no Gerador de Links, pressione **Enter** no terminal para salvar a sessão.
4. Sessão salva em `./data/ml_auth/` (montado no container via volume `./data`).

Repetir quando links de afiliado falharem (cookie expirado).

## Variáveis obrigatórias

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão PostgreSQL |
| `REDIS_URL` | Conexão Redis |
| `WHATSAPP_CHANNEL_ID` | ID do canal WhatsApp |
| `ML_CATEGORIES` | Categorias ou URLs de listagem |
| `AFFILIATE_CONFIG` | Tag de afiliado (`{"tag":"sua-tag"}`) |

Opcionais: `ML_AUTH_PATH`, `ML_USE_BROWSER_FALLBACK`, `ML_BROWSER_HEADLESS`, `ML_SEARCH_LIMIT`, `QUEUE_CONFIG`.

## Docker + Playwright

O `Dockerfile` usa `node:22-bookworm-slim` com Chromium instalado para fallback de scraping e geração de links.

- Coleta HTTP funciona sem browser na maioria dos casos.
- Fallback Playwright disponível no container `app`.
- `ml:login` recomendado no host (requer navegador visível).

## Local (sem Docker)

```bash
# Terminal 1 — infra
docker compose up postgres redis

# Setup sessão afiliado (uma vez)
npm run ml:login

# Terminal 2 — collector
npm run dev

# Terminal 3 — worker
npm run worker
```

## Scripts npm

| Script | Descrição |
|--------|-----------|
| `dev` | Collector + fila de coleta |
| `worker` | Worker de envio WhatsApp |
| `ml:login` | Login afiliado ML (salva sessão) |
| `migrate` | Prisma migrate dev |
| `build` | Compila TypeScript |
