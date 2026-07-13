# Deployment — Docker

## Serviços (docker-compose)

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| postgres | postgres:16-alpine | 5432 | Banco de dados |
| redis | redis:7-alpine | 6379 | Filas BullMQ |
| app | build local (bookworm + Chromium) | — | Collector (scraping + enfileira) |
| worker | build local | — | WhatsApp + envio |

> O **manager** não está no docker-compose — rodar separadamente com `npm run manager` (ou adicionar serviço futuro).

## Primeiro deploy

```bash
cp .env.example .env
# Editar .env com valores reais

docker compose up -d postgres redis
npm run migrate
docker compose up -d
npm run manager   # opcional — painel admin
```

## Autenticação WhatsApp

```bash
npm run wa:login
```

Ou via worker: `docker compose logs -f worker` e escanear QR. Sessão persistida em `./data/auth_info_baileys`.

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

Opcionais: `APP_TIMEZONE`, `ML_AUTH_PATH`, `ML_USE_BROWSER_FALLBACK`, `ML_BROWSER_HEADLESS`, `ML_SEARCH_LIMIT`, `ML_HTTP_TIMEOUT_MS`, `QUEUE_CONFIG`, `MANAGER_PORT`, `MANAGER_TOKEN`, `REDIS_ENABLED`.

## Docker + Playwright

O `Dockerfile` usa `node:22-bookworm-slim` com Chromium instalado para fallback de scraping e geração de links.

- Coleta HTTP funciona sem browser na maioria dos casos.
- Fallback Playwright disponível no container `app`.
- `ml:login` recomendado no host (requer navegador visível).

## Local (sem Docker)

```bash
# Infra
docker compose up postgres redis

# Setup sessões (uma vez)
npm run ml:login
npm run wa:login

# Tudo de uma vez
npm run up

# Ou separado:
npm run dev       # collector
npm run worker    # sender
npm run manager   # painel
```

## Scripts npm

| Script | Descrição |
|--------|-----------|
| `up` | Sobe collector + worker + manager (com preflight) |
| `check` | Preflight — valida ambiente |
| `setup` | Preflight + guia de setup |
| `dev` | Collector + fila de coleta |
| `worker` | Worker de envio WhatsApp |
| `manager` | Painel web admin |
| `ml:login` | Login afiliado ML (salva sessão) |
| `wa:login` | Login WhatsApp (QR) |
| `wa:channel` | Obter ID do canal |
| `migrate` | Prisma migrate dev |
| `test` | Testes unitários |
| `build` | Compila TypeScript |

## Preflight

Todos os processos principais rodam preflight antes de iniciar (`predev`, `preworker`, `premanager`). Use `npm run check` para validar manualmente.
