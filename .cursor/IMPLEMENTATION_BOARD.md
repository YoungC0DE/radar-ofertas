# Implementation Board

Quadro de tarefas do projeto **Radar Ofertas**. Atualizar conforme o desenvolvimento avança.

> **Decisão arquitetural (atual):** scraping híbrido HTTP + Playwright. Sessão de afiliado persistida em `ML_AUTH_PATH` (estilo Baileys). Config runtime em tabela `settings` editável pelo manager. Um canal = um processo = uma fila. API Oficial descartada.

---

## 🔴 Backlog

### Multi-conta (completar)

- [ ] **Crítico:** `enqueueOfferSend` usar `getSenderQueue(channel, accountId)` em vez de `getSenderQueue(channel)`
- [ ] **Crítico:** `jobs/sender.ts` ler `accountId` do job e passar para `findDelivery` / `markOfferDelivered`
- [ ] Adicionar `accountId` ao `SenderJobData` e ao payload do job
- [ ] Workers parametrizados por conta (`WORKER_ACCOUNT_ID` ou spawn no painel)
- [ ] `whatsapp/index.ts` e `mercado-livre/session.ts` resolver auth path por `accountId`
- [ ] `invalidateAccountsCache` em add/toggle (hoje só em delete)

### Scraping — coleta de produtos

- [ ] Testar parser contra HTML real de `lista.mercadolivre.com.br` em ambiente sem anti-bot (curl local retorna página de verificação)

### Afiliado — links encurtados

- [ ] **Crítico:** capturar endpoint `createLink` real via DevTools e confirmar `CREATE_LINK_ENDPOINTS` em `affiliate-link.ts`
- [ ] Ajustar seletores do link-builder em `createLinkViaBrowser()` conforme UI atual do portal (validação manual)

### Manager — segurança

- [ ] CSRF token nos POSTs destrutivos (delete oferta, workers, contas)
- [ ] `escapeHtml` escapar aspas simples (`'`) — XSS em `views/accounts.ts` L60 (`onsubmit`)
- [ ] Propagar `MANAGER_TOKEN` em forms ou migrar para sessão/cookie
- [ ] Limite de tamanho em `readFormBody`

### Qualidade e infra

- [ ] Criar testes para `affiliate-link.ts` com mocks de fetch
- [ ] Criar testes de integração do collector com HTTP mockado
- [ ] Testes para `jobs/`, `queue/`, `repository` (DB)
- [ ] Health check endpoints para app e worker (manager já tem `/manager/health`)
- [ ] ESLint + Prettier
- [ ] Pool de filas BullMQ reutilizáveis (hoje cria/fecha Queue a cada enqueue)
- [ ] Documentar troubleshooting de sessão expirada e anti-bot

---

## 🟡 Em andamento

### Multi-conta (parcial)

- [x] Domínio `src/accounts/` (tipos, paths, repository, default)
- [x] `account_id` em `offer_deliveries` (migration + unique + índices)
- [x] Página `/manager/accounts` (add, toggle, delete)
- [x] `dispatchOffer` fan-out por conta habilitada
- [x] `senderJobId` e `getSenderQueueName` com `accountId`
- [ ] Fila e worker propagam `accountId` (ver backlog crítico acima)

---

## 🟢 Concluído

### Canais de envio

- [x] Contrato `ChannelPublisher` (`channels/types.ts`)
- [x] Publishers WhatsApp e Telegram
- [x] `jobs/sender.ts` genérico por canal
- [x] `worker-runner.ts` compartilhado
- [x] Filas separadas: `offer-sender` + `offer-sender-telegram`
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
- [x] Agendamento via collector (due once + daily)
- [x] Jobs `send-auto-message` na fila do canal

### Contas (UI + schema)

- [x] Domínio `src/accounts/`
- [x] Página `/manager/accounts`
- [x] Migration `account_id` em `offer_deliveries`

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

- [x] Testes unitários: parser, category-url, message-template, sampling, circuit-breaker, coupon-parser, ml-sources-config, datetime, service
- [x] Script `preflight.ts` com profiles (collector, worker, worker-telegram, manager)
- [x] Script `up.ts` — orquestra collector + manager
- [x] Janela operacional de envio (`sender-schedule.ts` + `APP_TIMEZONE`)
- [x] `REDIS_ENABLED=false` para dev sem Redis
- [x] CI GitHub Actions: `tsc` (tsconfig.check.json) + `npm test`
- [x] `tsconfig.check.json` inclui `src/` e `manager/`

### Infraestrutura

- [x] Estrutura do projeto por domínio
- [x] Configuração de ambiente com Zod (`config/env.ts`)
- [x] Docker Compose (postgres, redis, app, worker, worker-telegram, manager)
- [x] Dockerfile com Chromium para Playwright fallback
- [x] Prisma + PostgreSQL (offers, offer_deliveries, auto_messages, settings)
- [x] Filas BullMQ (`offer-collector`, `offer-sender`, `offer-sender-telegram`)
- [x] Logger centralizado (pino)
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
- [x] WhatsApp Baileys (conexão, reconexão, lock de dono, envio)
- [x] Telegram Bot API (envio stateless)
- [x] Agendamento periódico de coleta (reagendável via manager)

### Documentação

- [x] `.cursor/context/project.md` — escopo atualizado
- [x] `.cursor/docs/` — architecture, channels, accounts, database, queues, manager, deployment
- [x] `.cursor/rules/` — rules sincronizadas com código atual

### Removido / descartado

- [x] Integração via API Oficial (`api.mercadolibre.com`)
- [x] `buildAffiliateLink` síncrono com apenas query params

---

## 💡 Melhorias futuras

- **Stealth browser:** Camoufox ou playwright-extra para reduzir detecção no fallback.
- **Proxy rotativo:** Para coleta em volume alto sem ban de IP.
- **Fila dedicada de links:** Separar geração de afiliado do collector para não bloquear coleta.
- **Múltiplas tags de afiliado:** Selecionar tag por canal/categoria/conta.
- **Webhook de alerta:** Notificar quando sessão ML expirar (similar a QR WhatsApp).
- **Model Prisma `Account`:** Migrar de JSON blob para tabela relacional com FK.

---

## Guia rápido para o próximo agente

### Onde começar

1. Rodar `npm run check` para validar ambiente.
2. Rodar `npm run ml:login` e validar que `storage-state.json` é criado.
3. Acessar `http://localhost:3000/manager` para configurar score, template e horários.
4. **Prioridade máxima (multi-conta):** corrigir `enqueueOfferSend` + `jobs/sender.ts` para propagar `accountId`.
5. **Prioridade alta (afiliado):** capturar request `createLink` real via DevTools.

### Arquivos-chave

| Arquivo | O que fazer aqui |
|---------|------------------|
| `src/queue/index.ts` | Filas, enqueue, job IDs — corrigir `getSenderQueue(channel, accountId)` |
| `src/jobs/sender.ts` | Worker genérico — propagar `accountId` nas entregas |
| `src/offers/service.ts` | Pipeline + `dispatchOffer` |
| `src/mercado-livre/affiliate-link.ts` | Endpoint createLink, seletores UI |
| `src/accounts/repository.ts` | Contas multi-plataforma |
| `manager/http/routes/index.ts` | Rotas do painel |
| `prisma/schema.prisma` | Schema (offers, deliveries, auto_messages, settings) |

### Comandos úteis

```bash
npm run up              # collector + manager (workers via painel)
npm run check           # valida ambiente
npm run ml:login        # login afiliado (navegador visível)
npm run wa:login        # login WhatsApp (QR)
npm run manager         # painel admin
npm run worker          # envio WhatsApp (ou iniciar via painel)
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
```
