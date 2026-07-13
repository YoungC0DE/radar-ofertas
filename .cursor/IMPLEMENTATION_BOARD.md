# Implementation Board

Quadro de tarefas do projeto **Radar Ofertas**. Atualizar conforme o desenvolvimento avança.

> **Decisão arquitetural (atual):** scraping híbrido HTTP + Playwright. Sessão de afiliado persistida em `ML_AUTH_PATH` (estilo Baileys). Config runtime em tabela `settings` editável pelo manager. API Oficial descartada.

---

## 🔴 Backlog

### Scraping — coleta de produtos

- [ ] Testar parser contra HTML real de `lista.mercadolivre.com.br` em ambiente sem anti-bot (curl local retorna página de verificação)

### Afiliado — links encurtados

- [ ] **Crítico:** capturar endpoint `createLink` real via DevTools e confirmar `CREATE_LINK_ENDPOINTS` em `affiliate-link.ts`
- [ ] Ajustar seletores do link-builder em `createLinkViaBrowser()` conforme UI atual do portal (validação manual)

### Qualidade e infra

- [ ] Criar testes para `affiliate-link.ts` com mocks de fetch
- [ ] Criar testes de integração do collector com HTTP mockado
- [ ] Health check endpoints para app e worker (manager já tem `/manager/health`)
- [ ] Documentar troubleshooting de sessão expirada e anti-bot
- [ ] Adicionar serviço `manager` ao docker-compose

---

## 🟡 Em andamento

(vazio)

---

## 🟢 Concluído

### Painel admin (manager)

- [x] Estrutura MVC em `manager/` (routes, controllers, models, views)
- [x] Dashboard com status, coleta manual e envio imediato
- [x] Lista e detalhe de ofertas com preview de mensagem
- [x] Settings: score, brand, horários operacionais, intervalos, canal
- [x] Editor de template WhatsApp com placeholders
- [x] Auth opcional via `MANAGER_TOKEN`
- [x] Health check em `/manager/health`
- [x] Preflight profile `manager`

### Config runtime (settings DB)

- [x] Tabela `settings` (migration + Prisma schema)
- [x] `score-config.ts` — regras de pontuação editáveis
- [x] `brand-config.ts` — nome/logo do painel
- [x] `queue-config-store.ts` — intervalos, horários, search limit
- [x] `message-template.ts` — template WhatsApp editável
- [x] `channel-cache.ts` — cache de canal WhatsApp
- [x] Cache em memória com hidratação no startup

### Scraping — coleta de produtos

- [x] Validar URLs de listagem para cada `ML_CATEGORIES` configurada — `category-url.ts`
- [x] Implementar paginação (`_Desde_`) em `http-scraper.ts`
- [x] Implementar retry com exponential backoff para HTTP 403/429/5xx
- [x] Warm-up de cookies antes da primeira requisição HTTP (anti-bot)
- [x] Coleta paralela de categorias com limite de concorrência (`runWithConcurrency`)
- [x] Extrair `sold_quantity`, `rating` e `sales_rank` do HTML no parser

### Afiliado — links encurtados

- [x] Validar múltiplos payloads do `createLink` (campos `url`, `tag`, `short_url`, variantes)
- [x] Detectar sessão expirada e logar alerta claro (`run npm run ml:login`)
- [x] Renovação automática de cookies via GET no link-builder (`session.ts`)
- [x] Rate limit na geração de links (500ms entre chamadas)
- [x] Cache de links já gerados por `mercado_livre_id`
- [x] Logs estruturados com `affiliate_source` (http/browser/cache/fallback)

### Qualidade e infra

- [x] Testes unitários para `parser.ts`, `category-url.ts` e `message-template.ts`
- [x] Script `preflight.ts` com profiles (collector, worker, manager)
- [x] Script `up.ts` — orquestra collector + worker + manager
- [x] Janela operacional de envio (`sender-schedule.ts` + `APP_TIMEZONE`)
- [x] `REDIS_ENABLED=false` para dev sem Redis

### Infraestrutura

- [x] Estrutura do projeto por domínio
- [x] Configuração de ambiente com Zod (`config/env.ts`)
- [x] Docker Compose (postgres, redis, app, worker)
- [x] Dockerfile com Chromium para Playwright fallback
- [x] Prisma + PostgreSQL (schema `offers` + `settings`)
- [x] Filas BullMQ (`offer-collector`, `offer-sender`)
- [x] Logger centralizado (pino)
- [x] Processos separados: `app.ts`, `worker.ts`, `ml-login.ts`, `manager/server.ts`

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
- [x] Formatação de mensagem WhatsApp via template
- [x] Pipeline `processOffer` → persistência → enfileiramento

### Jobs e integrações

- [x] Job collector (`jobs/collector.ts`)
- [x] Job sender (`jobs/sender.ts`) com idempotência e janela operacional
- [x] WhatsApp Baileys (conexão, reconexão, envio)
- [x] Agendamento periódico de coleta (reagendável via manager)

### Documentação

- [x] `.cursor/context/project.md` — escopo atualizado
- [x] `.cursor/docs/architecture.md` — manager + settings
- [x] `.cursor/docs/manager.md` — guia do painel
- [x] `.cursor/docs/database.md` — tabela settings
- [x] `.cursor/rules/manager.mdc` — regras do painel
- [x] Rules e docs sincronizados com código atual

### Removido / descartado

- [x] Integração via API Oficial (`api.mercadolibre.com`)
- [x] `buildAffiliateLink` síncrono com apenas query params

---

## 💡 Melhorias futuras

- **Stealth browser:** Camoufox ou playwright-extra para reduzir detecção no fallback.
- **Proxy rotativo:** Para coleta em volume alto sem ban de IP.
- **Fila dedicada de links:** Separar geração de afiliado do collector para não bloquear coleta.
- **Múltiplas tags de afiliado:** Selecionar tag por canal/categoria.
- **Webhook de alerta:** Notificar quando sessão ML expirar (similar a QR WhatsApp).
- **Manager no Docker:** Adicionar serviço ao docker-compose com porta exposta.

---

## Guia rápido para o próximo agente

### Onde começar

1. Rodar `npm run check` para validar ambiente.
2. Rodar `npm run ml:login` e validar que `storage-state.json` é criado.
3. Acessar `http://localhost:3000/manager` para configurar score, template e horários.
4. **Prioridade máxima:** abrir DevTools no link-builder, capturar request `createLink` real, atualizar `affiliate-link.ts`.

### Arquivos-chave

| Arquivo | O que fazer aqui |
|---------|------------------|
| `src/mercado-livre/parser.ts` | Ajustar extração de produtos do HTML |
| `src/mercado-livre/affiliate-link.ts` | Endpoint createLink, seletores UI |
| `src/config/score-config.ts` | Regras de pontuação |
| `src/offers/message-template.ts` | Template WhatsApp |
| `manager/routes/index.ts` | Rotas do painel |
| `src/offers/service.ts` | Pipeline de ofertas — não mexer em scraping aqui |

### Comandos úteis

```bash
npm run up          # sobe tudo (collector + worker + manager)
npm run check       # valida ambiente
npm run ml:login    # login afiliado (navegador visível)
npm run wa:login    # login WhatsApp (QR)
npm run manager     # painel admin
npm run test        # testes unitários
npm run build       # verificar TypeScript
```

### ENV mínimo para testar

```env
ML_CATEGORIES=MLB1648
ML_AUTH_PATH=./data/ml_auth
AFFILIATE_CONFIG={"tag":"sua-tag-afiliado"}
ML_USE_BROWSER_FALLBACK=true
MANAGER_PORT=3000
```
