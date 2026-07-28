# Frontend + API REST

Painel admin via **SPA React** + **API REST Fastify**. O manager SSR foi removido na Fase 6.

## Desenvolvimento local

```bash
npm run up            # collector + scheduler + api + frontend
# ou separado:
npm run api           # :3001
npm run dev:frontend  # :5173
```

Login: `API_ADMIN_USERNAME` / `API_ADMIN_PASSWORD`.

## Produção (Docker)

- **frontend** — nginx + SPA em `FRONTEND_PORT`
- **api** — Fastify + noVNC opcional (`MANAGER_VNC_ENABLED`)

## Estrutura

| Pasta | Responsabilidade |
|-------|------------------|
| `frontend/` | SPA React (Vite) |
| `backend/api/` | Rotas, controllers, auth JWT |
| `packages/shared/` | DTOs/tipos da API (consumidos pelo frontend) |
| `manager/models/` | Models de dados (temporário — usado pela API) |

## Paridade

Checklist manual: `.cursor/docs/parity-checklist.md`

Páginas React: `.cursor/docs/frontend.md`

Deploy: `.cursor/docs/deployment.md`
