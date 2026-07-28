# Checklist de paridade — manager SSR → React + API

Cutover concluído (Fase 6). Referência para validação manual e E2E.

## Páginas

| Manager SSR (removido) | React | API |
|------------------------|-------|-----|
| `/manager` | `/` | `GET /api/v1/dashboard` |
| `/manager/offers` | `/offers` | `GET /api/v1/offers` |
| `/manager/offers/:id` | `/offers/:id` | `GET /api/v1/offers/:id` |
| `/manager/template` | `/template` | `GET/PATCH /api/v1/template/*` |
| `/manager/settings` | `/settings` | `GET/PATCH /api/v1/settings/*` |
| `/manager/coupons` | `/coupons` | `GET/POST /api/v1/coupons/*` |
| `/manager/sources/:channel` | `/sources/:channel` | `GET/PATCH /api/v1/sources/:channel` |
| `/manager/accounts` | `/accounts` | `GET/POST/PATCH /api/v1/accounts/*` |
| `/manager/logs` | `/logs` | `GET /api/v1/logs`, `GET /api/v1/logs/stream` (SSE) |

## Fluxos críticos (E2E manual)

- [x] Login JWT (`/login`) com credenciais admin — `frontend/e2e/login.spec.ts`
- [x] Dashboard — coleta manual (`POST /offers/collect`) — coberto via ofertas E2E
- [x] Ofertas — filtro, detalhe, envio imediato, delete — `frontend/e2e/offers.spec.ts`
- [x] Settings — salvar score, brand, horários, afiliados — `frontend/e2e/settings.spec.ts`
- [x] Settings › Conexões — QR WhatsApp, login ML, verify Telegram — `frontend/e2e/connections.spec.ts` (QR)
- [x] Settings › Operações — worker start/stop (dev local) — `frontend/e2e/worker.spec.ts`
- [x] Contas — CRUD, configs WhatsApp/Telegram/ML — `frontend/e2e/accounts.spec.ts`
- [x] Template — ofertas, cupom, auto-messages CRUD — `frontend/e2e/template.spec.ts`
- [x] Cupons — refresh, envio, store link — `frontend/e2e/coupons.spec.ts`
- [x] Fontes — toggles ML/Amazon por canal — `frontend/e2e/sources.spec.ts`
- [x] Logs — filtros, auto-scroll, modal meta (SSE + fallback polling) — `frontend/e2e/logs.spec.ts`

## Auth

| Antes | Depois |
|-------|--------|
| `MANAGER_TOKEN` query/header | JWT access + refresh (`/api/v1/auth/*`) |

## Docker

Painel único: `http://localhost:3000` (frontend nginx → api).

Login ML no Docker: noVNC no serviço `api` (`MANAGER_VNC_ENABLED=true`).
