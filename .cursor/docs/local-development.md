# Desenvolvimento local

Guia para rodar **backend + frontend + infra** na máquina de desenvolvimento.

## Pré-requisitos

- Node.js 20+
- Docker (PostgreSQL + Redis) ou instâncias locais
- `.env` configurado (`cp .env.example .env`)

## Setup inicial

```bash
npm install
docker compose up -d postgres redis
npm run migrate:deploy
npm run check
```

## Modo recomendado — tudo de uma vez

```bash
npm run up
```

Sobe em paralelo:

| Processo | Porta | Função |
|----------|-------|--------|
| collector | — | Coleta de ofertas |
| scheduler | — | Auto-messages |
| API REST | 3001 | `/api/v1/*` |
| Vite | 5173 | SPA React |

Painel: `http://localhost:5173` — login com `API_ADMIN_USERNAME` / `API_ADMIN_PASSWORD`.

## Modo separado

Terminal 1 — infra:

```bash
docker compose up -d postgres redis
```

Terminal 2 — API:

```bash
npm run api
```

Terminal 3 — frontend:

```bash
npm run dev:frontend
```

Terminal 4 — collector (opcional):

```bash
npm run dev
```

Terminal 5 — worker (dev local):

```bash
npm run worker
```

Em dev, `MANAGER_CAN_SPAWN_WORKERS=true` permite controlar o worker pelo painel (Settings › Operações).

## Testes

```bash
npm test                  # node:test (src + backend + manager/models) + vitest (frontend)
npm run test:e2e          # Playwright E2E da SPA (API mockada)
npm run test --workspace=frontend   # só frontend
npx tsc -p tsconfig.check.json --noEmit
npm run build:frontend
```

## Docker completo (produção local)

```bash
docker compose up -d --build
# Painel: http://localhost:3000
```

## Docker + hot reload do frontend (Vite)

O serviço `frontend` padrão serve **build estático** via nginx — exige rebuild a cada mudança.

Para **HMR** com backend no Docker:

```bash
# 1. Pare o nginx estático (se estiver rodando)
docker compose stop frontend

# 2. Suba infra + backend + Vite dev
npm run docker:dev
# ou só o frontend-dev (com api/redis/postgres já no ar):
npm run docker:dev:frontend
```

| URL | Modo |
|-----|------|
| http://localhost:5173 | Vite dev + HMR (alterações instantâneas) |
| http://localhost:3000 | nginx + build estático (produção local) |

O container `frontend-dev` monta `./frontend` e `./packages/shared` como volume — edite os arquivos no host e o Vite recarrega automaticamente.

**Alternativa mais leve (sem Vite no Docker):** infra no Docker, Vite no host:

```bash
docker compose up -d postgres redis
docker compose up -d migrate api collector scheduler worker
npm run dev:frontend   # :5173 com HMR, proxy /api → localhost:3001
```

Requer `API_PORT=3001` publicada — use `docker-compose.dev.yml` ou `npm run docker:dev`.

## Segurança (API)

| Tema | Implementação |
|------|----------------|
| Auth | JWT access + refresh (`JWT_SECRET` ≥ 32 chars) |
| CSRF | Não necessário — SPA usa Bearer token, não cookies de sessão para mutações |
| XSS | React escapa JSX; evitar `dangerouslySetInnerHTML` |
| Rate limit | `@fastify/rate-limit` em `/auth/login` e `/auth/refresh` (10 req/min) |
| Body size | Máx. 1 MB (`error-handler` plugin) |
| CORS | `API_CORS_ORIGINS` ou localhost dev |

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `JWT_SECRET` inválido | Definir segredo ≥ 32 chars no `.env` |
| API 401 no frontend | Verificar login; token expirado → refresh automático |
| Worker não conecta WA | `npm run worker` ou spawn pelo painel; Redis ativo |
| ML login no Docker | `MANAGER_VNC_ENABLED=true` + rebuild serviço `api` |

Ver também: `.cursor/docs/deployment.md`, `.cursor/docs/frontend-api.md`.
