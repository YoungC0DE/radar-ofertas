# Implementation Board

Quadro de tarefas do projeto **Radar Ofertas**. Atualizar conforme o desenvolvimento avança.

> **Decisão arquitetural (atual):** scraping híbrido HTTP + Playwright. Sessão de afiliado persistida em `ML_AUTH_PATH` (estilo Baileys). Config runtime em tabela `settings` editável pelo manager. Um canal = um processo = uma fila. Contas em tabela Prisma `accounts`. Manager stateless em produção (Redis + `owner.lock`). API Oficial descartada.
>
> **Decisão arquitetural (planejada):** monorepo com `backend/` (domínio + workers + API REST), `frontend/` (React SPA) e Docker na raiz. Painel SSR (`manager/`) será substituído gradualmente; regras de negócio permanecem em `src/`.

---

## 🔴 Backlog

### Separação backend / frontend (React + API REST)

> Migração do painel `manager/` (MVC server-rendered) para **API REST no backend** + **SPA React no frontend**, mantendo collector, scheduler e worker inalterados. Estrutura alvo: `backend/`, `frontend/`, arquivos Docker na raiz.

#### Fase 0 — Estrutura do monorepo

- [ ] Criar pasta `backend/` e mover `src/`, `prisma/`, `manager/` (temporário), configs TS e scripts npm do domínio
- [ ] Criar pasta `frontend/` com projeto React (Vite + TypeScript)
- [ ] Criar pasta `docker/` na raiz e mover `Dockerfile` + `docker-compose.yml` (ajustar paths de build)
- [ ] Configurar workspaces npm (ou equivalente) na raiz — scripts `dev`, `build`, `test` orquestrando backend + frontend
- [ ] Criar `packages/shared/` (ou `backend/src/shared/`) com DTOs/tipos exportados para o frontend (OfferRecord, Account, settings, etc.)
- [ ] Atualizar `tsconfig.check.json` e CI para incluir `backend/` e `frontend/`
- [ ] Documentar estrutura alvo em `.cursor/docs/architecture.md` e `README.md`

#### Fase 1 — Fundação da API REST (backend)

- [ ] Escolher framework HTTP da API (Fastify ou Express) — entry dedicado (`backend/api/server.ts`), separado de collector/scheduler/worker
- [ ] Definir prefixo e versionamento (`/api/v1/...`) — mapear rotas atuais de `manager/http/routes/index.ts`
- [ ] Implementar middleware de erro padronizado (JSON `{ error, code, details? }`)
- [ ] Implementar validação de entrada com Zod em todos os endpoints (body, query, params)
- [ ] Implementar limite de tamanho de body (substitui débito de `readFormBody`)
- [ ] Implementar autenticação: sessão httpOnly (cookie) ou JWT + refresh — substituir `MANAGER_TOKEN` via query/header
- [ ] Implementar proteção CSRF para mutações (cookie + header/token)
- [ ] Configurar CORS (dev: origin do Vite; prod: mesmo domínio ou allowlist)
- [ ] Extrair controllers/models do `manager/` para `backend/api/` — models continuam delegando para domínio em `src/`
- [ ] Publicar contrato OpenAPI (`/api/v1/openapi.json`) gerado a partir dos schemas Zod ou documentação manual
- [ ] Health check: `GET /api/v1/health` (equivalente a `/manager/health`)

#### Fase 2 — Endpoints REST por domínio (backend)

**Dashboard e operações**

- [ ] `GET /api/v1/dashboard` — status geral (coleta, filas, workers, integrações)
- [ ] `POST /api/v1/offers/collect` — enfileirar coleta manual (equiv. `POST /manager/offers/collect`)
- [ ] `GET /api/v1/metrics` — métricas de envio (equiv. `/manager/api/metrics`)

**Ofertas**

- [ ] `GET /api/v1/offers` — listagem com filtro por status e paginação
- [ ] `GET /api/v1/offers/:id` — detalhe + preview da mensagem
- [ ] `PATCH /api/v1/offers/settings/search-limit` — limite de busca
- [ ] `PATCH /api/v1/offers/settings/affiliate-delay` — delay de links afiliado
- [ ] `POST /api/v1/offers/:id/send-now` — envio imediato
- [ ] `DELETE /api/v1/offers/:id` — remover oferta
- [ ] `DELETE /api/v1/offers/pending` — remover todas pendentes

**Settings**

- [ ] `GET /api/v1/settings` — snapshot completo (score, brand, horários, intervalos, conexões)
- [ ] `PATCH /api/v1/settings/score` — regras de pontuação
- [ ] `PATCH /api/v1/settings/brand` — nome, subtítulo, logo
- [ ] `PATCH /api/v1/settings/operating-hours` — janela operacional
- [ ] `PATCH /api/v1/settings/send-interval` — intervalo de coleta
- [ ] `PATCH /api/v1/settings/sender-delay` — delay entre envios
- [ ] `PATCH /api/v1/settings/coupons-url` — URL da página de cupons ML
- [ ] `PATCH /api/v1/settings/amazon-affiliate` — baseUrl, storeId, prefixo

**Template e auto-messages**

- [ ] `GET /api/v1/template` — template de ofertas, cupons e lista de auto-messages
- [ ] `PATCH /api/v1/template/offer` — template de ofertas
- [ ] `PATCH /api/v1/template/coupon` — template de cupons
- [ ] `POST /api/v1/auto-messages` — criar auto-message
- [ ] `PATCH /api/v1/auto-messages/:id` — editar auto-message
- [ ] `DELETE /api/v1/auto-messages/:id` — remover auto-message
- [ ] `POST /api/v1/auto-messages/:id/send` — envio manual

**Cupons**

- [ ] `GET /api/v1/coupons` — listagem (equiv. `/manager/api/coupons`)
- [ ] `POST /api/v1/coupons/refresh` — refresh sob demanda
- [ ] `POST /api/v1/coupons/:id/send` — enviar cupom
- [ ] `PATCH /api/v1/coupons/:id/store-link` — link de loja

**Fontes (ML + Amazon por canal)**

- [ ] `GET /api/v1/sources/:channel` — fontes ML e Amazon do canal (`whatsapp` | `telegram`)
- [ ] `PATCH /api/v1/sources/:channel` — flags ativar/desativar fontes do `.env`
- [ ] `POST /api/v1/sources/:channel/ml` — adicionar fonte ML customizada
- [ ] `DELETE /api/v1/sources/:channel/ml/:sourceId` — remover fonte ML
- [ ] `POST /api/v1/sources/:channel/amazon` — adicionar fonte Amazon customizada
- [ ] `DELETE /api/v1/sources/:channel/amazon/:sourceId` — remover fonte Amazon

**Contas (multi-plataforma)**

- [ ] `GET /api/v1/accounts` — listagem de contas
- [ ] `POST /api/v1/accounts` — adicionar conta
- [ ] `PATCH /api/v1/accounts/:accountId/:platform/toggle` — habilitar/desabilitar
- [ ] `DELETE /api/v1/accounts/:accountId/:platform` — remover conta
- [ ] `PATCH /api/v1/accounts/:accountId/whatsapp-channel` — canal WhatsApp
- [ ] `POST /api/v1/accounts/:accountId/whatsapp-destinations` — adicionar destino
- [ ] `DELETE /api/v1/accounts/:accountId/whatsapp-destinations` — remover destino
- [ ] `PATCH /api/v1/accounts/:accountId/whatsapp-destinations/toggle` — toggle destino
- [ ] `PATCH /api/v1/accounts/:accountId/telegram` — config Telegram
- [ ] `PATCH /api/v1/accounts/:accountId/mercado-livre` — config ML

**Conexões (WhatsApp, ML, Telegram)**

- [ ] `POST /api/v1/accounts/:accountId/connect/whatsapp/start` — iniciar pareamento
- [ ] `GET /api/v1/accounts/:accountId/connect/whatsapp/status` — status + QR (Redis)
- [ ] `POST /api/v1/accounts/:accountId/connect/mercado-livre/start` — abrir fluxo ML (Playwright)
- [ ] `POST /api/v1/accounts/:accountId/connect/mercado-livre/finish` — salvar sessão
- [ ] `POST /api/v1/accounts/:accountId/connect/mercado-livre/cancel` — cancelar fluxo
- [ ] `GET /api/v1/accounts/:accountId/connect/mercado-livre/status` — status do fluxo
- [ ] `GET /api/v1/accounts/:accountId/connect/telegram/verify` — validar config Telegram

**Workers e processos**

- [ ] `GET /api/v1/worker/status` — status do worker unificado (Redis + `owner.lock`)
- [ ] `POST /api/v1/worker/start` — spawn local (somente `MANAGER_CAN_SPAWN_WORKERS=true`)
- [ ] `POST /api/v1/worker/stop` — encerrar worker local
- [ ] `POST /api/v1/worker/restart` — reiniciar worker local
- [ ] `GET /api/v1/prisma/status` — status do generate (dev)
- [ ] `POST /api/v1/prisma/generate` — rodar prisma generate (dev)

**Logs**

- [ ] `GET /api/v1/logs` — logs paginados/filtrados (equiv. `/manager/api/logs`)
- [ ] Implementar SSE ou WebSocket `GET /api/v1/logs/stream` — tail em tempo real (substitui polling pesado)

#### Fase 3 — Fundação do frontend React

- [ ] Configurar Vite + React + TypeScript + React Router
- [ ] Configurar proxy de dev (`/api` → backend) e variável `VITE_API_BASE_URL`
- [ ] Cliente HTTP tipado (fetch/axios) com interceptors de auth e tratamento de erro
- [ ] Gerar ou importar tipos da API a partir de `packages/shared` ou OpenAPI codegen
- [ ] Layout base — shell, navegação lateral/top (equiv. `manager/views/layout/shell.ts`)
- [ ] Componentes compartilhados — cards, badges, toggles, tabs, modais, alerts (equiv. `manager/views/components/`)
- [ ] Tema visual — portar `manager/public/css/base.css` para CSS modules ou Tailwind (manter identidade visual)
- [ ] Fluxo de login/auth — tela de login ou bootstrap de sessão; guard de rotas privadas
- [ ] Hooks utilitários — polling (QR WhatsApp, worker status), confirmação de ações destrutivas
- [ ] Tratamento global de toasts/feedback (substitui query params `?sentNow=1`, `?collectError=`, etc.)

#### Fase 4 — Páginas React (paridade com manager SSR)

**Dashboard**

- [ ] Página `/` — dashboard com cards de status, coleta manual e envio imediato (equiv. `views/dashboard.ts`)

**Ofertas**

- [ ] Página `/offers` — listagem com filtro por status (equiv. `views/offers.ts` + `public/js/offers.js`)
- [ ] Página `/offers/:id` — detalhe, preview da mensagem, ações delete/send (equiv. `views/offer-detail.ts`)
- [ ] Formulários inline — search limit e affiliate delay

**Settings**

- [ ] Página `/settings` — abas: Geral, Score, Brand, Horários, Afiliados, Conexões, Operações (equiv. `views/settings/`)
- [ ] Seção Score — editor de tiers (equiv. `settings/sections/score-section.ts`)
- [ ] Seção Brand — nome, subtítulo, upload logo base64 (equiv. `brand-section.ts`)
- [ ] Seção Horários operacionais (equiv. `operating-hours-section.ts`)
- [ ] Seção Afiliados — Amazon + delay de links (equiv. `affiliate-section.ts`)
- [ ] Seção Conexões — cards WhatsApp/Telegram/ML (equiv. `connections-section.ts`)
- [ ] Seção Operações — worker start/stop/restart, status Redis (equiv. modals + `settings.js`)
- [ ] Modais de conexão WhatsApp (QR polling) e ML (start/finish/cancel) (equiv. `connect-modals.ts`)

**Template**

- [ ] Página `/template` — editor de template de ofertas e cupons + CRUD auto-messages (equiv. `views/template.ts` + `public/js/template.js`)

**Cupons**

- [ ] Página `/coupons` — listagem, refresh, envio, store link (equiv. `views/coupons.ts`)

**Fontes**

- [ ] Página `/sources/:channel` — ML + Amazon, add/remove, toggles (equiv. `views/sources.ts` + `public/js/sources.js`)

**Contas**

- [ ] Página `/accounts` — CRUD multi-plataforma, destinos WhatsApp, configs por conta (equiv. `views/accounts.ts` + `public/js/accounts.js`)

**Logs**

- [ ] Página `/logs` — viewer com filtros e auto-scroll (equiv. `views/logs/` + `public/js/logs.js`)

#### Fase 5 — Docker, deploy e CI

- [ ] Dockerfile multi-stage: `backend` (API + workers compartilham imagem base bookworm + Chromium)
- [ ] Dockerfile `frontend` — build estático + nginx (ou servir via CDN)
- [ ] Serviço `api` no docker-compose — substitui/complementa serviço `manager` atual
- [ ] Serviço `frontend` no docker-compose — proxy reverso unificando `/` (SPA) e `/api` (backend)
- [ ] Manter serviços `collector`, `scheduler`, `worker`, `postgres`, `redis`, `migrate` inalterados (ajustar apenas paths/volumes)
- [ ] Preservar noVNC no container da API para login ML no Docker (`MANAGER_VNC_ENABLED`)
- [ ] Variáveis de ambiente — separar `API_PORT`, `FRONTEND_PORT`, `VITE_*` vs secrets do backend
- [ ] Atualizar `npm run up` / `scripts/up.ts` — subir API + frontend em dev (sem manager SSR)
- [ ] Atualizar preflight — profile `api` substituindo `manager`
- [ ] Atualizar CI — build backend + frontend, testes de ambos, `tsc` nos três pacotes
- [ ] Atualizar `.cursor/docs/deployment.md` e `.cursor/docs/manager.md` (renomear para `frontend-api.md`)

#### Fase 6 — Cutover e remoção do manager SSR

- [ ] Rodar API + React em paralelo ao manager SSR (feature flag ou rotas separadas) durante transição
- [ ] Checklist de paridade funcional — validar cada rota antiga vs nova (54 rotas)
- [ ] Testes E2E da SPA — fluxos críticos: login, settings save, QR WhatsApp, coleta manual, envio oferta
- [ ] Testes de integração da API — endpoints principais com DB/Redis mockados
- [ ] Remover `manager/views/` e rotas HTML de `manager/http/routes/`
- [ ] Remover `manager/public/` (CSS/JS estáticos do painel antigo)
- [ ] Remover entry `npm run manager` e serviço Docker `manager`
- [ ] Remover hot reload SSE do manager (`manager/dev/`) — substituído por Vite HMR
- [ ] Arquivar ou remover pasta `manager/` após cutover completo

#### Fase 7 — Qualidade pós-migração

- [ ] Testes unitários dos handlers da API (auth, validação Zod, error middleware)
- [ ] Testes de componentes React (forms de settings, modais de conexão)
- [ ] Revisão de segurança — CSRF, XSS (React escapa por padrão), rate limit na API
- [ ] Documentar fluxo de desenvolvimento local (`backend/` + `frontend/` + infra Docker)
- [ ] Atualizar `.cursor/rules/architecture.mdc` e `.cursor/rules/manager.mdc` → `frontend.mdc` + `api.mdc`

---

### Multi-conta (painel)

- [x] Painel spawna workers com `WORKER_ACCOUNT_ID` por conta habilitada (`process-model.ts`)

### Scraping — coleta de produtos

- [ ] Testar parser contra HTML real de `lista.mercadolivre.com.br` em ambiente sem anti-bot (curl local retorna página de verificação)

### Afiliado — links encurtados

- [ ] **Crítico:** capturar endpoint `createLink` real via DevTools e confirmar `CREATE_LINK_ENDPOINTS` em `affiliate-link.ts`
- [ ] Ajustar seletores do link-builder em `createLinkViaBrowser()` conforme UI atual do portal (validação manual)

### Manager — segurança

> _Itens abaixo serão resolvidos na migração React + API REST (Fase 1). Manter até cutover do manager SSR._

- [ ] CSRF token nos POSTs destrutivos (delete oferta, workers, contas) → **supersedido por:** Fase 1 API REST
- [ ] `escapeHtml` escapar aspas simples (`'`) — XSS em `views/accounts.ts` L60 (`onsubmit`) → **supersedido por:** React (Fase 4)
- [ ] Propagar `MANAGER_TOKEN` em forms ou migrar para sessão/cookie → **supersedido por:** Fase 1 API REST
- [ ] Limite de tamanho em `readFormBody` → **supersedido por:** Fase 1 API REST

### Qualidade e infra

- [ ] Criar testes para `affiliate-link.ts` com mocks de fetch
- [ ] Criar testes de integração do collector com HTTP mockado
- [ ] Testes para `jobs/`, `queue/`, `repository` (DB)
- [ ] Health check endpoints para app e worker (manager já tem `/manager/health`)
- [ ] ESLint + Prettier
- [ ] Documentar troubleshooting de sessão expirada e anti-bot

---

## 🟡 Em andamento

_(nenhum item ativo)_

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
4. Acessar `http://localhost:3000/manager` para configurar score, template e horários.
5. **Prioridade alta (afiliado):** capturar request `createLink` real via DevTools.
6. ~~**Prioridade média (multi-conta UI):** spawn de workers por conta no painel.~~ ✅
7. **Prioridade estrutural:** iniciar **Fase 0** da seção *Separação backend / frontend* no backlog acima.

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
| `manager/http/routes/index.ts` | Rotas do painel |
| `prisma/schema.prisma` | Schema (offers, deliveries, accounts, settings) |

### Comandos úteis

```bash
npm run up              # collector + scheduler + manager (workers: Docker ou painel em dev)
npm run check           # valida ambiente
npm run migrate         # aplica migrations (inclui tabela accounts)
npm run ml:login        # login afiliado (navegador visível)
npm run wa:login        # login WhatsApp (QR no terminal)
npm run manager         # painel admin
npm run worker          # envio WhatsApp (ou serviço Docker)
WORKER_ACCOUNT_ID=x npm run worker   # worker de conta específica
npm run worker:telegram # envio Telegram
npm test                # testes unitários
npx tsc -p tsconfig.check.json --noEmit  # tipos src + manager
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
