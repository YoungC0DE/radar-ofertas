# Implementation Board

Quadro de tarefas do projeto **Radar Ofertas**. Atualizar conforme o desenvolvimento avança.

> **Decisão arquitetural (atual):** scraping híbrido HTTP + Playwright. Sessão de afiliado persistida em `ML_AUTH_PATH` (estilo Baileys). Config runtime em tabela `settings` editável pelo manager. Um canal = um processo = uma fila. Contas em tabela Prisma `accounts`. Manager stateless em produção (Redis + `owner.lock`). API Oficial descartada.
>
> **Decisão arquitetural (atual):** monorepo parcial — `backend/` (domínio + workers + API + Prisma), `frontend/` (React SPA), `docker/` na raiz. Painel SSR removido; `backend/manager/models/` permanece como camada de dados da API até migração futura.

---

## 🔴 Backlog

### Separação backend / frontend (React + API REST)

> Migração do painel `manager/` (MVC server-rendered) para **API REST no backend** + **SPA React no frontend**, mantendo collector, scheduler e worker inalterados. Estrutura alvo: `backend/`, `frontend/`, arquivos Docker na raiz.

#### Fase 0 — Estrutura do monorepo

- [x] Mover `src/`, `prisma/` e `manager/models/` para dentro de `backend/` (refatoração estrutural)
- [x] Criar pasta `backend/api/` com entry Fastify dedicado
- [x] Criar pasta `frontend/` com projeto React (Vite + TypeScript)
- [x] Criar pasta `docker/` na raiz (`Dockerfile.backend`, `Dockerfile.frontend`, nginx, entrypoints)
- [x] Configurar workspace npm para `frontend/` — scripts raiz orquestram `api`, `dev:frontend`, `build:frontend`, `test`
- [x] Criar `packages/shared/` com DTOs/tipos exportados para o frontend
- [x] Atualizar `tsconfig.check.json` (`src/`, `manager/models/`, `backend/`, `packages/shared/`) e CI (`tsc`, `build:frontend`, `lint`, `test`)
- [x] Documentar estrutura em `.cursor/docs/frontend-api.md`, `local-development.md`, `deployment.md`

#### Fase 1 — Fundação da API REST (backend)

- [x] Framework Fastify — entry `backend/api/server.ts`, separado de collector/scheduler/worker
- [x] Prefixo e versionamento `/api/v1/*` — rotas em `backend/api/routes/`
- [x] Middleware de erro padronizado (`plugins/error-handler.ts` → `{ error, code, details? }`)
- [x] Validação Zod em todos os endpoints (`schemas/` + `lib/validate.ts`)
- [x] Limite de body 1 MB (`bodyLimit` no Fastify)
- [x] Autenticação JWT access + refresh (`/auth/login`, `/auth/refresh`) — substitui `MANAGER_TOKEN`
- [x] CSRF — **N/A** (SPA usa Bearer token, sem cookies de sessão para mutações)
- [x] CORS (`API_CORS_ORIGINS` ou localhost dev 5173/3000)
- [x] Controllers em `backend/api/controllers/` — models em `manager/models/` delegam para `src/`
- [x] Publicar contrato OpenAPI (`GET /api/v1/openapi.json`) — spec em `backend/api/openapi/spec.ts`
- [x] Health check: `GET /api/v1/health` (DB ping)

#### Fase 2 — Endpoints REST por domínio (backend)

**Dashboard e operações**

- [x] `GET /api/v1/dashboard` — status geral (coleta, filas, workers, integrações)
- [x] `POST /api/v1/offers/collect` — enfileirar coleta manual (equiv. `POST /manager/offers/collect`)
- [x] `GET /api/v1/metrics` — métricas de envio (equiv. `/manager/api/metrics`)

**Ofertas**

- [x] `GET /api/v1/offers` — listagem com filtro por status e paginação
- [x] `GET /api/v1/offers/:id` — detalhe + preview da mensagem
- [x] `PATCH /api/v1/offers/settings/search-limit` — limite de busca
- [x] `PATCH /api/v1/offers/settings/affiliate-delay` — delay de links afiliado
- [x] `POST /api/v1/offers/:id/send-now` — envio imediato
- [x] `DELETE /api/v1/offers/:id` — remover oferta
- [x] `DELETE /api/v1/offers/pending` — remover todas pendentes

**Settings**

- [x] `GET /api/v1/settings` — snapshot completo (score, brand, horários, intervalos, conexões)
- [x] `PATCH /api/v1/settings/score` — regras de pontuação
- [x] `PATCH /api/v1/settings/brand` — nome, subtítulo, logo
- [x] `PATCH /api/v1/settings/operating-hours` — janela operacional
- [x] `PATCH /api/v1/settings/send-interval` — intervalo de coleta
- [x] `PATCH /api/v1/settings/sender-delay` — delay entre envios
- [x] `PATCH /api/v1/settings/coupons-url` — URL da página de cupons ML
- [x] `PATCH /api/v1/settings/amazon-affiliate` — baseUrl, storeId, prefixo

**Template e auto-messages**

- [x] `GET /api/v1/template` — template de ofertas, cupons e lista de auto-messages
- [x] `PATCH /api/v1/template/offer` — template de ofertas
- [x] `PATCH /api/v1/template/coupon` — template de cupons
- [x] `POST /api/v1/auto-messages` — criar auto-message
- [x] `PATCH /api/v1/auto-messages/:id` — editar auto-message
- [x] `DELETE /api/v1/auto-messages/:id` — remover auto-message
- [x] `POST /api/v1/auto-messages/:id/send` — envio manual

**Cupons**

- [x] `GET /api/v1/coupons` — listagem (equiv. `/manager/api/coupons`)
- [x] `POST /api/v1/coupons/refresh` — refresh sob demanda
- [x] `POST /api/v1/coupons/:id/send` — enviar cupom
- [x] `PATCH /api/v1/coupons/:id/store-link` — link de loja

**Fontes (ML + Amazon por canal)**

- [x] `GET /api/v1/sources/:channel` — fontes ML e Amazon do canal (`whatsapp` | `telegram`)
- [x] `PATCH /api/v1/sources/:channel` — flags ativar/desativar fontes do `.env`
- [x] `POST /api/v1/sources/:channel/ml` — adicionar fonte ML customizada
- [x] `DELETE /api/v1/sources/:channel/ml/:sourceId` — remover fonte ML
- [x] `POST /api/v1/sources/:channel/amazon` — adicionar fonte Amazon customizada
- [x] `DELETE /api/v1/sources/:channel/amazon/:sourceId` — remover fonte Amazon

**Contas (multi-plataforma)**

- [x] `GET /api/v1/accounts` — listagem de contas
- [x] `POST /api/v1/accounts` — adicionar conta
- [x] `PATCH /api/v1/accounts/:accountId/:platform/toggle` — habilitar/desabilitar
- [x] `DELETE /api/v1/accounts/:accountId/:platform` — remover conta
- [x] `PATCH /api/v1/accounts/:accountId/whatsapp-channel` — canal WhatsApp
- [x] `POST /api/v1/accounts/:accountId/whatsapp-destinations` — adicionar destino
- [x] `DELETE /api/v1/accounts/:accountId/whatsapp-destinations` — remover destino
- [x] `PATCH /api/v1/accounts/:accountId/whatsapp-destinations/toggle` — toggle destino
- [x] `PATCH /api/v1/accounts/:accountId/telegram` — config Telegram
- [x] `PATCH /api/v1/accounts/:accountId/mercado-livre` — config ML

**Conexões (WhatsApp, ML, Telegram)**

- [x] `POST /api/v1/accounts/:accountId/connect/whatsapp/start` — iniciar pareamento
- [x] `GET /api/v1/accounts/:accountId/connect/whatsapp/status` — status + QR (Redis)
- [x] `POST /api/v1/accounts/:accountId/connect/mercado-livre/start` — abrir fluxo ML (Playwright)
- [x] `POST /api/v1/accounts/:accountId/connect/mercado-livre/finish` — salvar sessão
- [x] `POST /api/v1/accounts/:accountId/connect/mercado-livre/cancel` — cancelar fluxo
- [x] `GET /api/v1/accounts/:accountId/connect/mercado-livre/status` — status do fluxo
- [x] `GET /api/v1/accounts/:accountId/connect/telegram/verify` — validar config Telegram

**Workers e processos**

- [x] `GET /api/v1/worker/status` — status do worker unificado (Redis + `owner.lock`)
- [x] `POST /api/v1/worker/start` — spawn local (somente `MANAGER_CAN_SPAWN_WORKERS=true`)
- [x] `POST /api/v1/worker/stop` — encerrar worker local
- [x] `POST /api/v1/worker/restart` — reiniciar worker local
- [x] `GET /api/v1/prisma/status` — status do generate (dev)
- [x] `POST /api/v1/prisma/generate` — rodar prisma generate (dev)

**Logs**

- [x] `GET /api/v1/logs` — logs paginados/filtrados (equiv. `/manager/api/logs`)
- [x] Implementar SSE `GET /api/v1/logs/stream` — tail em tempo real (fallback polling no frontend)

#### Fase 3 — Fundação do frontend React

- [x] Configurar Vite + React + TypeScript + React Router
- [x] Configurar proxy de dev (`/api` → backend) e variável `VITE_API_BASE_URL`
- [x] Cliente HTTP tipado (fetch/axios) com interceptors de auth e tratamento de erro
- [x] Tipos da API em `packages/shared/` — frontend reexporta via `types/api.ts`
- [x] Layout base — shell, navegação lateral/top (equiv. `manager/views/layout/shell.ts`)
- [x] Componentes compartilhados — cards, badges, toggles, tabs, modais, alerts (equiv. `manager/views/components/`)
- [x] Tema visual — portar `manager/public/css/base.css`; **tema claro + escuro** via CSS variables (`data-theme`) — ver `.cursor/docs/frontend.md`
- [x] Fluxo de login/auth — tela de login ou bootstrap de sessão; guard de rotas privadas
- [x] Hooks utilitários — polling (QR WhatsApp, worker status), confirmação de ações destrutivas
- [x] Tratamento global de toasts/feedback (substitui query params `?sentNow=1`, `?collectError=`, etc.)

#### Fase 4 — Páginas React (paridade com manager SSR)

**Dashboard**

- [x] Página `/` — dashboard com cards de status, coleta manual e envio imediato (equiv. `views/dashboard.ts`)

**Ofertas**

- [x] Página `/offers` — listagem com filtro por status (equiv. `views/offers.ts` + `public/js/offers.js`)
- [x] Página `/offers/:id` — detalhe, preview da mensagem, ações delete/send (equiv. `views/offer-detail.ts`)
- [x] Formulários inline — search limit e affiliate delay

**Settings**

- [x] Página `/settings` — abas: Geral, Afiliados, Operações (equiv. `views/settings/`)
- [x] Seção Score — editor de tiers (equiv. `settings/sections/score-section.ts`)
- [x] Seção Brand — nome, subtítulo, upload logo base64 (equiv. `brand-section.ts`)
- [x] Seção Horários operacionais (equiv. `operating-hours-section.ts`)
- [x] Seção Afiliados — ML (URL cupons + links fontes), Amazon (equiv. `affiliate-section.ts`)
- [x] Seção Conexões — cards WhatsApp/Telegram/ML (equiv. `connections-section.ts`)
- [x] Seção Operações — worker start/stop/restart, Prisma generate (equiv. modals + `settings.js`)
- [x] Modais de conexão WhatsApp (QR polling) e ML (start/finish/cancel) (equiv. `connect-modals.ts`)

**Template**

- [x] Página `/template` — editor de template de ofertas e cupons + CRUD auto-messages (equiv. `views/template.ts` + `public/js/template.js`)

**Cupons**

- [x] Página `/coupons` — listagem, refresh, envio, store link (equiv. `views/coupons.ts`)

**Fontes**

- [x] Página `/sources/:channel` — ML + Amazon, add/remove, toggles (equiv. `views/sources.ts` + `public/js/sources.js`)

**Contas**

- [x] Página `/accounts` — CRUD multi-plataforma, destinos WhatsApp, configs por conta (equiv. `views/accounts.ts` + `public/js/accounts.js`)

**Logs**

- [x] Página `/logs` — viewer com filtros e auto-scroll (equiv. `views/logs/` + `public/js/logs.js`)

#### Fase 5 — Docker, deploy e CI

- [x] Dockerfile multi-stage: `backend` (API + workers compartilham imagem base bookworm + Chromium)
- [x] Dockerfile `frontend` — build estático + nginx (ou servir via CDN)
- [x] Serviço `api` no docker-compose — substitui/complementa serviço `manager` atual
- [x] Serviço `frontend` no docker-compose — proxy reverso unificando `/` (SPA) e `/api` (backend)
- [x] Manter serviços `collector`, `scheduler`, `worker`, `postgres`, `redis`, `migrate` inalterados (ajustar apenas paths/volumes)
- [x] Preservar noVNC no container da API para login ML no Docker (`MANAGER_VNC_ENABLED`)
- [x] Variáveis de ambiente — separar `API_PORT`, `FRONTEND_PORT`, `VITE_*` vs secrets do backend
- [x] Atualizar `npm run up` / `scripts/up.ts` — subir API + frontend em dev (sem manager SSR)
- [x] Atualizar preflight — profile `api` substituindo `manager`
- [x] Atualizar CI — build backend + frontend, testes de ambos, `tsc` nos três pacotes
- [x] Atualizar `.cursor/docs/deployment.md` e `.cursor/docs/manager.md` (renomear para `frontend-api.md`)

#### Fase 6 — Cutover e remoção do manager SSR

- [x] Rodar API + React em paralelo ao manager SSR (feature flag ou rotas separadas) durante transição
- [x] Checklist de paridade funcional — validar cada rota antiga vs nova (54 rotas)
- [x] Testes E2E da SPA — scaffold Playwright (login, erro de auth, navegação ofertas; API mockada)
- [x] Testes de integração da API — logs, offers, settings (+ auth, health existentes)
- [x] Remover `manager/views/` e rotas HTML de `manager/http/routes/`
- [x] Remover `manager/public/` (CSS/JS estáticos do painel antigo)
- [x] Remover entry `npm run manager` e serviço Docker `manager`
- [x] Remover hot reload SSE do manager (`manager/dev/`) — substituído por Vite HMR
- [x] Arquivar ou remover pasta `manager/` após cutover completo — mantido `manager/models/` para API

#### Fase 7 — Qualidade pós-migração

- [x] Testes unitários dos handlers da API (auth, validação Zod, error middleware)
- [x] Testes de componentes React (forms de settings, modais de conexão)
- [x] Revisão de segurança — CSRF, XSS (React escapa por padrão), rate limit na API
- [x] Documentar fluxo de desenvolvimento local (`backend/` + `frontend/` + infra Docker)
- [x] Atualizar `.cursor/rules/architecture.mdc` e `.cursor/rules/manager.mdc` → `frontend.mdc` + `api.mdc`

### Qualidade pós-migração (continuação)

- [x] Contrato OpenAPI em `GET /api/v1/openapi.json`
- [x] Testes `mercado-livre/affiliate-link.ts` (parse HTTP + fallback + mock fetch)
- [x] E2E Playwright — login, erro de auth, navegação sidebar (`npm run test:e2e`)
- [x] CI — step `test:e2e` com Chromium

---

### Multi-conta (painel)

- [x] Painel spawna workers com `WORKER_ACCOUNT_ID` por conta habilitada (`process-model.ts`)

### Scraping — coleta de produtos

- [ ] Testar parser contra HTML real de `lista.mercadolivre.com.br` em ambiente sem anti-bot (curl local retorna página de verificação) — ver `.cursor/docs/troubleshooting.md`; fixture + teste HTTP mockado cobre parser

### Afiliado — links encurtados

- [ ] **Crítico:** capturar endpoint `createLink` real via DevTools e confirmar `CREATE_LINK_ENDPOINTS` em `affiliate-link.ts` — guia em `.cursor/docs/troubleshooting.md`
- [ ] Ajustar seletores do link-builder em `createLinkViaBrowser()` conforme UI atual do portal (validação manual)

### Manager — segurança

> _Itens do manager SSR — **resolvidos** com a migração React + API REST._

- [x] CSRF token nos POSTs destrutivos → JWT Bearer (sem cookie de sessão)
- [x] XSS em `views/accounts.ts` → React escapa JSX
- [x] `MANAGER_TOKEN` → JWT access + refresh
- [x] Limite de body em `readFormBody` → `bodyLimit` 1 MB no Fastify

### Qualidade e infra

- [x] Criar testes para `mercado-livre/affiliate-link.ts` com mocks de fetch
- [x] Criar testes de integração do collector com HTTP mockado (`http-scraper.integration.test.ts`, `orchestrate-collection.test.ts`)
- [x] Testes para `jobs/`, `queue/` (`redis-disabled.test.ts`, `queue-names.test.ts`, `collector.test.ts`, `sender.test.ts`)
- [ ] Testes para `repository` (DB) — requer Postgres de teste ou mocks Prisma
- [x] Health check endpoints para collector e worker (`GET /api/v1/health/collector`, `/health/worker`; heartbeat Redis no collector)
- [x] ESLint + Prettier (CI: `npm run lint`, `format:check`)
- [x] Documentar troubleshooting de sessão expirada e anti-bot (`.cursor/docs/troubleshooting.md`)

---

## 🟡 Em andamento

(nenhum item estrutural pendente)

### Migração React + API (concluída)

- [x] Testes E2E ampliados — settings save, QR WhatsApp, coleta manual, envio oferta
- [x] SSE `GET /api/v1/logs/stream`
- [x] `packages/shared` com tipos frontend
- [x] Documentação atualizada (README, project.md, parity-checklist)

---

## 🟢 Concluído

### Escalabilidade (Fases 1–4)

- [x] **Fase 1:** Pool de filas BullMQ reutilizáveis (`getQueue` + `closeAllQueues`)
- [x] **Fase 2:** Multi-conta runtime — fila, sender, `WORKER_ACCOUNT_ID`, publishers parametrizados
- [x] **Fase 3:** Contas em tabela Prisma `accounts` + migration de dados + validação Zod
- [x] **Fase 4:** Manager stateless — `MANAGER_CAN_SPAWN_WORKERS`, heartbeat Redis, QR/status no Redis

### Canais de envio

- [x] Contrato `ChannelPublisher` (`channels/types.ts`)
- [x] Publishers WhatsApp e Telegram
- [x] `jobs/sender.ts` genérico por canal
- [x] `worker-runner.ts` compartilhado + heartbeat Redis
- [x] Filas separadas: `offer-sender` + `offer-sender-telegram` (+ sufixo por `accountId`)
- [x] `OfferDelivery` como fonte da verdade por canal
- [x] Fan-out `dispatchOffer` com entrega aberta antes de enfileirar
- [x] Worker Telegram no docker-compose + `npm run worker:telegram`

### Cupons

- [x] Scraping de cupons ML (`coupons.ts` + `coupon-parser.ts`)
- [x] Página `/manager/coupons` (refresh, envio, store link)
- [x] Template de cupons (`couponMessageTemplate` em settings)
- [x] `coupon-service.ts` — envio por texto livre nos canais
- [x] Testes: `coupon-parser.test.ts`, `coupon-message.test.ts`

### Mensagens automáticas

- [x] Model `AutoMessage` no Prisma (manual / once / daily)
- [x] Domínio `auto-messages/` (repository + service)
- [x] UI em `/manager/template` (CRUD + envio manual)
- [x] Agendamento via `scheduler.ts` (due once + daily; tick a cada 60s)
- [x] Jobs `send-auto-message` na fila do canal

### Contas (UI + schema + Prisma)

- [x] Domínio `src/accounts/`
- [x] Página `/manager/accounts`
- [x] Migration `account_id` em `offer_deliveries`
- [x] Model `Account` + migration de dados (`settings.accounts` → tabela)
- [x] Validação Zod de `config` por plataforma (`account-config.ts`)
- [x] `invalidateAccountsCache` em add/toggle/delete

### Multi-conta (runtime)

- [x] `enqueueOfferSend` com fila por `accountId`
- [x] `jobs/sender.ts` delivery por conta
- [x] `WORKER_ACCOUNT_ID` + publishers parametrizados (`worker-publisher.ts`)
- [x] Pool de filas BullMQ reutilizáveis (`getQueue`)

### Manager stateless (Fase 4)

- [x] `MANAGER_CAN_SPAWN_WORKERS` — spawn desligado no Docker
- [x] Status de worker via `owner.lock` + heartbeat Redis (`radar:worker:{channel}:{accountId}`)
- [x] QR/status WhatsApp no Redis (`radar:connect:wa:{accountId}`)
- [x] Painel lê estado externo (não é dono do processo em produção)
- [x] `src/utils/redis-state.ts` — heartbeat + connect state

### Painel admin (manager)

- [x] Estrutura MVC em `manager/` (http/, controllers, models, views)
- [x] Router declarativo em `http/routes/index.ts` (~54 rotas)
- [x] Dashboard com status, coleta manual e envio imediato
- [x] Lista e detalhe de ofertas com preview de mensagem
- [x] Fontes ML por canal (`/manager/sources/:channel`)
- [x] Settings: score, brand, horários operacionais, intervalos, canal
- [x] Editor de template (ofertas + cupons + auto-messages)
- [x] Auth opcional via `MANAGER_TOKEN`
- [x] Health check em `/manager/health` + `/manager/api/metrics`
- [x] Preflight profile `manager`
- [x] Views modularizadas: `components/`, `layout/`, `settings/sections/`

### Config runtime (settings DB)

- [x] Tabela `settings` (migration + Prisma schema)
- [x] `score-config.ts` — regras de pontuação editáveis
- [x] `brand-config.ts` — nome/logo do painel
- [x] `queue-config-store.ts` — intervalos, horários, search limit
- [x] `ml-sources-config.ts` — fontes por canal
- [x] `coupons-config-store.ts` — URL de cupons
- [x] `message-template.ts` — template editável
- [x] `channel-cache.ts` — cache de canal WhatsApp
- [x] Cache em memória com hidratação no startup

### Scraping — coleta de produtos

- [x] Validar URLs de listagem — `category-url.ts`
- [x] Paginação (`_Desde_`) em `http-scraper.ts`
- [x] Retry com exponential backoff para HTTP 403/429/5xx
- [x] Circuit breaker (`circuit-breaker.ts`)
- [x] Warm-up de cookies antes da primeira requisição HTTP (anti-bot)
- [x] Coleta paralela de categorias com limite de concorrência
- [x] Coleta independente por canal com `searchLimit` por canal
- [x] Sorteio de ofertas (`offers/sampling.ts`)
- [x] Extrair `sold_quantity`, `rating`, `sales_rank`, `seller`, `best_seller`

### Afiliado — links encurtados

- [x] Validar múltiplos payloads do `createLink`
- [x] Detectar sessão expirada e logar alerta claro
- [x] Renovação automática de cookies via GET no link-builder
- [x] Rate limit na geração de links (500ms entre chamadas)
- [x] Cache de links já gerados por `mercado_livre_id`
- [x] Geração sob demanda no envio (timeout 10s, sem browser)
- [x] Logs estruturados com `affiliate_source` (http/browser/cache/fallback)

### Qualidade e infra

- [x] Testes unitários: parser, category-url, message-template, sampling, circuit-breaker, coupon-parser, ml-sources-config, datetime, service, account-config, redis-state
- [x] Script `preflight.ts` com profiles (collector, worker, worker-telegram, manager)
- [x] Script `up.ts` — orquestra collector + scheduler + manager
- [x] Janela operacional de envio (`sender-schedule.ts` + `APP_TIMEZONE`)
- [x] `REDIS_ENABLED=false` para dev sem Redis
- [x] CI GitHub Actions: `tsc` (tsconfig.check.json) + `npm test`
- [x] `tsconfig.check.json` inclui `src/` e `manager/`

### Infraestrutura

- [x] Estrutura do projeto por domínio
- [x] Configuração de ambiente com Zod (`config/env.ts`)
- [x] Docker Compose (postgres, redis, app, worker, worker-telegram, manager)
- [x] Dockerfile com Chromium para Playwright fallback
- [x] Prisma + PostgreSQL (offers, offer_deliveries, auto_messages, accounts, settings)
- [x] Filas BullMQ (`offer-collector`, `offer-sender`, `offer-sender-telegram` + por conta)
- [x] Logger centralizado (pino) + log-store Redis (`radar:app-logs`)
- [x] Processos separados: `app.ts`, `worker.ts`, `worker-telegram.ts`, `ml-login.ts`, `manager/server.ts`

### Mercado Livre — scraping híbrido

- [x] Módulo `mercado-livre/` dividido por responsabilidade
- [x] Coleta HTTP via `fetch` + parser HTML/JSON
- [x] Fallback Playwright para coleta
- [x] Suporte a `ML_CATEGORIES` como ID ou URL completa
- [x] Persistência de sessão afiliado (`session.ts`)
- [x] Login manual afiliado (`npm run ml:login`)
- [x] Geração de link afiliado em 3 níveis: HTTP → Playwright → fallback `matt_tool`
- [x] `buildAffiliateLink()` async integrado em `offers/service.ts`

### Regras de negócio

- [x] DTOs (`RawOffer`, `ScoredOffer`, `OfferRecord`)
- [x] Cálculo de score configurável (`score-config.ts`)
- [x] Deduplicação (`mercado_livre_id` unique + title+price)
- [x] Formatação de mensagem via template (ofertas + cupons)
- [x] Pipeline `processOffer` → persistência → `dispatchOffer`

### Jobs e integrações

- [x] Job collector (`jobs/collector.ts`) + auto-messages due
- [x] Job sender (`jobs/sender.ts`) com idempotência e janela operacional
- [x] WhatsApp Baileys (conexão, reconexão, lock de dono, envio, QR no Redis)
- [x] Telegram Bot API (envio stateless)
- [x] Agendamento periódico de coleta (reagendável via manager)

### Amazon (coleta + afiliado)

- [x] Módulo `src/amazon/` — HTTP + Playwright fallback, parser, browse node/busca/produto
- [x] `config/amazon-sources-config.ts` — fontes por canal (.env + custom)
- [x] `config/amazon-config-store.ts` — links de afiliado (`amazonAffiliateConfig`)
- [x] `sources/routing.ts` — roteamento unificado ML + Amazon no collector
- [x] `offers/platform.ts` + `offers/affiliate-link.ts` — detecção de plataforma e links
- [x] UI em `/manager/sources/:channel` (seção Amazon) + Settings › Afiliados › Amazon
- [x] `affiliates/registry.ts` — registro de plataformas (ML, Amazon, Shopee em breve)
- [x] Testes: `amazon/parser.test.ts`, `amazon/affiliate-link.test.ts`, `amazon-sources-config.test.ts`, `platform.test.ts`, `affiliates/registry.test.ts`

### Documentação

- [x] `.cursor/context/project.md` — escopo atualizado
- [x] `.cursor/docs/` — architecture, channels, accounts, database, queues, manager, deployment, amazon
- [x] `.cursor/rules/` — rules sincronizadas com código atual

### Removido / descartado

- [x] Integração via API Oficial (`api.mercadolibre.com`)
- [x] `buildAffiliateLink` síncrono com apenas query params
- [x] Contas em JSON blob (`settings.accounts`) — migrado para tabela Prisma

---

## 💡 Melhorias futuras

- **Stealth browser:** Camoufox ou playwright-extra para reduzir detecção no fallback.
- **Proxy rotativo:** Para coleta em volume alto sem ban de IP.
- **Fila dedicada de links:** Separar geração de afiliado do collector para não bloquear coleta.
- **Múltiplas tags de afiliado:** Selecionar tag por canal/categoria/conta.
- **Webhook de alerta:** Notificar quando sessão ML expirar (similar a QR WhatsApp).
- **Login ML no Redis:** Mover fluxo Playwright para serviço dedicado (hoje single-node no manager) — considerar junto com serviço `api` na Fase 5.
- **React Query / TanStack Query:** Cache e revalidação no frontend após migração (Fase 3+).

---

## Guia rápido para o próximo agente

### Onde começar

1. Rodar `npm run check` para validar ambiente.
2. Rodar `npm run migrate` se a tabela `accounts` ainda não existir.
3. Rodar `npm run ml:login` e validar que `storage-state.json` é criado.
4. Acessar `http://localhost:5173` para configurar score, template e horários.
5. **Prioridade alta (afiliado):** capturar request `createLink` real via DevTools.
6. **Próximo:** OpenAPI, E2E SPA, testes `affiliate-link.ts`.
7. ~~**Prioridade estrutural:** Fase 0 monorepo completo (mover `src/` → `backend/`).~~ Adiado — `backend/api/` + `frontend/` operacionais.

### Ordem sugerida da migração React + API

1. Fase 0 — estrutura monorepo (`backend/`, `frontend/`, `docker/`)
2. Fase 1 — API REST (auth, middleware, health)
3. Fase 3 — scaffold React (layout, auth, cliente HTTP) em paralelo à Fase 2
4. Fase 2 + Fase 4 — endpoint + página por domínio (dashboard → settings → ofertas → contas → logs)
5. Fase 5 — Docker/CI
6. Fase 6 — cutover e remoção do manager SSR

### Arquivos-chave

| Arquivo | O que fazer aqui |
|---------|------------------|
| `src/queue/index.ts` | Filas, enqueue, job IDs, pool `getQueue` |
| `src/jobs/sender.ts` | Worker genérico — `accountId` nas entregas |
| `src/offers/service.ts` | Pipeline + `dispatchOffer` |
| `src/accounts/repository.ts` | Contas multi-plataforma (Prisma) |
| `src/utils/redis-state.ts` | Heartbeat worker + QR/status WhatsApp |
| `manager/models/process-model.ts` | Spawn workers (dev) + status externo |
| `manager/models/connection-model.ts` | Lê QR do Redis; ML local |
| `src/mercado-livre/affiliate-link.ts` | Endpoint createLink, seletores UI |
| `backend/api/routes/` | Rotas REST da API |
| `frontend/src/pages/` | Páginas React |
| `prisma/schema.prisma` | Schema (offers, deliveries, accounts, settings) |

### Comandos úteis

```bash
npm run up              # collector + scheduler + api + frontend
npm run check           # valida ambiente
npm run migrate         # aplica migrations (inclui tabela accounts)
npm run ml:login        # login afiliado (navegador visível)
npm run wa:login        # login WhatsApp (QR no terminal)
npm run api             # API REST :3001
npm run dev:frontend    # SPA React :5173
npm run worker          # envio WhatsApp + Telegram
WORKER_ACCOUNT_ID=x npm run worker   # worker de conta específica
npm test                # testes unitários (backend + frontend)
npm run test:e2e        # E2E Playwright da SPA
npx tsc -p tsconfig.check.json --noEmit  # tipos src + manager/models + backend
```

### ENV mínimo para testar

```env
ML_CATEGORIES=MLB1648
ML_AUTH_PATH=./data/ml_auth
AFFILIATE_CONFIG={"tag":"sua-tag-afiliado"}
ML_USE_BROWSER_FALLBACK=true
MANAGER_PORT=3000
MANAGER_CAN_SPAWN_WORKERS=true   # dev local; false no Docker
REDIS_ENABLED=true               # necessário para QR no painel
```
