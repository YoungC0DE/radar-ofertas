# Manager SSR — removido

O painel server-rendered em `manager/views/` foi **removido na Fase 6** (cutover).

## Substituto

| Antes | Agora |
|-------|-------|
| `npm run manager` | `npm run api` + `npm run dev:frontend` ou `npm run up` |
| `http://localhost:3000/manager` | `http://localhost:5173` (dev) ou `http://localhost:3000` (Docker) |
| Rotas HTML em `manager/http/` | API REST em `backend/api/` |
| Views TS em `manager/views/` | SPA em `frontend/` |

## O que permanece em `manager/`

Apenas **`manager/models/`** — camada de dados usada pela API REST (settings, contas, ofertas, logs, etc.). Será migrada para `backend/` em refatoração futura.

## Documentação

- [frontend-api.md](./frontend-api.md) — stack atual
- [frontend.md](./frontend.md) — páginas React
- [parity-checklist.md](./parity-checklist.md) — validação de paridade
