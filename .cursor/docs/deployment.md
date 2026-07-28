# Deployment — Docker

## Serviços (docker-compose)

| Serviço | Imagem | Porta | Função |
|---------|--------|-------|--------|
| postgres | postgres:16-alpine | 5432 | Banco de dados |
| redis | redis:7-alpine | 6379 | Filas BullMQ + estado compartilhado |
| migrate | build backend | — | Aplica migrations (one-shot) |
| collector | build backend (bookworm + Chromium) | — | Coleta de ofertas (singleton) |
| scheduler | build backend | — | Mensagens automáticas |
| worker | build backend | — | Envio unificado — WhatsApp + Telegram |
| **api** | build backend | 3001 (interno) | API REST + login ML (noVNC opcional) |
| **frontend** | build nginx | `FRONTEND_PORT` (3000) | SPA React — proxy `/api` → api |

Workers e API definem `MANAGER_CAN_SPAWN_WORKERS=false`.

## Primeiro deploy

```bash
cp .env.example .env
# Editar .env: JWT_SECRET, API_ADMIN_*, WHATSAPP_CHANNEL_ID, AFFILIATE_CONFIG, etc.

docker compose up -d --build
```

Painel React: `http://localhost:3000` — login com `API_ADMIN_USERNAME` / `API_ADMIN_PASSWORD`.

Health checks (via API, leem heartbeat Redis):

```bash
curl http://localhost:3001/api/v1/health/collector
curl http://localhost:3001/api/v1/health/worker
```

Ver `.cursor/docs/troubleshooting.md`.

## Arquitetura de rede

```
Browser → frontend:80 (nginx)
              ├── /        → SPA estática
              └── /api/*   → proxy → api:3001
```

## Desenvolvimento local

```bash
docker compose up -d postgres redis
npm run migrate:deploy
npm run check
npm run up    # collector + scheduler + api + frontend (:5173)
```

## Autenticação WhatsApp

1. `docker compose up -d`
2. Settings › Conexões → escanear QR
3. Worker status em Settings › Operações

## Autenticação Mercado Livre

Via painel React ou `npm run ml:login` no host.

### noVNC (serviço `api`)

```bash
MANAGER_VNC_ENABLED=true
docker compose up -d --build api
# http://localhost:6080/vnc_lite.html?scale=true&path=websockify
```

Logs devem mostrar `[api-vnc] Xvfb pronto em :99`.

## Variáveis principais

| Variável | Descrição |
|----------|-----------|
| `JWT_SECRET` | Segredo JWT (mín. 32 chars) |
| `API_PORT` | Porta interna da API (3001) |
| `FRONTEND_PORT` | Porta publicada do nginx (3000) |
| `MANAGER_VNC_ENABLED` | noVNC no container api |

Ver `.env.example` para lista completa.

## Dockerfiles

| Arquivo | Uso |
|---------|-----|
| `docker/Dockerfile.backend` | collector, scheduler, worker, migrate, api |
| `docker/Dockerfile.frontend` | nginx + SPA |

## CI

`npm ci` → `tsc` → `build:frontend` → `lint` → `test`
