# Implementation Board

Quadro de tarefas do projeto **Radar Ofertas**. Atualizar conforme o desenvolvimento avança.

> **Decisão arquitetural (atual):** scraping híbrido HTTP + Playwright. Sessão de afiliado persistida em `ML_AUTH_PATH` (estilo Baileys). API Oficial descartada.

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
- [ ] Health check endpoints para app e worker
- [ ] Documentar troubleshooting de sessão expirada e anti-bot

---

## 🟡 Em andamento

(vazio)

---

## 🟢 Concluído

### Scraping — coleta de produtos (novo)

- [x] Validar URLs de listagem para cada `ML_CATEGORIES` configurada (IDs vs URLs completas) — `category-url.ts`
- [x] Implementar paginação (`_Desde_`) em `http-scraper.ts`
- [x] Implementar retry com exponential backoff para HTTP 403/429/5xx
- [x] Warm-up de cookies antes da primeira requisição HTTP (anti-bot)
- [x] Coleta paralela de categorias com limite de concorrência (`runWithConcurrency`)
- [x] Extrair `sold_quantity` e `rating` do HTML no parser Cheerio

### Afiliado — links encurtados (novo)

- [x] Validar múltiplos payloads do `createLink` (campos `url`, `tag`, `short_url`, variantes)
- [x] Detectar sessão expirada e logar alerta claro (`run npm run ml:login`)
- [x] Renovação automática de cookies via GET no link-builder (`session.ts`)
- [x] Rate limit na geração de links (500ms entre chamadas)
- [x] Cache de links já gerados por `mercado_livre_id`
- [x] Logs estruturados com `affiliate_source` (http/browser/cache/fallback)

### Qualidade e infra (novo)

- [x] Testes unitários para `parser.ts` e `category-url.ts` (fixtures HTML + `npm run test`)

### Infraestrutura

- [x] Estrutura do projeto por domínio
- [x] Configuração de ambiente com Zod (`config/env.ts`)
- [x] Docker Compose (postgres, redis, app, worker)
- [x] Dockerfile com Chromium para Playwright fallback
- [x] Prisma + PostgreSQL (schema `offers`)
- [x] Filas BullMQ (`offer-collector`, `offer-sender`)
- [x] Logger centralizado (pino)
- [x] Processos separados: `app.ts`, `worker.ts`, `ml-login.ts`

### Mercado Livre — scraping híbrido

- [x] Módulo `mercado-livre/` dividido por responsabilidade (parser, http, browser, session, affiliate, auth)
- [x] Coleta HTTP via `fetch` + parser HTML/JSON (`http-scraper.ts`, `parser.ts`)
- [x] Fallback Playwright para coleta (`browser-scraper.ts`)
- [x] Suporte a `ML_CATEGORIES` como ID ou URL completa
- [x] Variáveis ENV: `ML_AUTH_PATH`, `ML_USE_BROWSER_FALLBACK`, `ML_BROWSER_HEADLESS`, `ML_SCRAPER_USER_AGENT`
- [x] Persistência de sessão afiliado (`session.ts` — `storage-state.json`, `session-meta.json`)
- [x] Login manual afiliado (`npm run ml:login` → `auth.ts`)
- [x] Geração de link afiliado em 3 níveis: HTTP createLink → Playwright → fallback `matt_tool` (`affiliate-link.ts`)
- [x] `buildAffiliateLink()` async integrado em `offers/service.ts`
- [x] Dependências: `cheerio`, `playwright` (+ postinstall chromium)

### Regras de negócio

- [x] DTOs (`RawOffer`, `ScoredOffer`, `OfferRecord`)
- [x] Cálculo de score e filtros
- [x] Deduplicação (`mercado_livre_id` unique)
- [x] Formatação de mensagem WhatsApp
- [x] Pipeline `processOffer` → persistência → enfileiramento

### Jobs e integrações

- [x] Job collector (`jobs/collector.ts`)
- [x] Job sender (`jobs/sender.ts`) com idempotência
- [x] WhatsApp Baileys (conexão, reconexão, envio)
- [x] Agendamento periódico de coleta

### Documentação

- [x] `.cursor/context/project.md` — escopo e decisão scraping híbrido
- [x] `.cursor/docs/architecture.md` — diagrama e fluxo atualizado
- [x] `.cursor/docs/mercado-livre.md` — guia técnico do domínio
- [x] `.cursor/docs/deployment.md` — `ml:login` e Docker + Chromium
- [x] `.cursor/rules/mercado-livre.mdc` — regras do domínio
- [x] `.cursor/rules/architecture.mdc` — atualizado
- [x] Implementation Board atualizado

### Removido / descartado

- [x] Integração via API Oficial (`api.mercadolibre.com`, `MERCADO_LIVRE_TOKEN`, `ML_SITE_ID`)
- [x] `buildAffiliateLink` síncrono com apenas query params (substituído por fluxo async com sessão)

---

## 💡 Melhorias futuras

- **Stealth browser:** Camoufox ou playwright-extra para reduzir detecção no fallback.
- **Proxy rotativo:** Para coleta em volume alto sem ban de IP.
- **Fila dedicada de links:** Separar geração de afiliado do collector para não bloquear coleta.
- **Painel admin:** Status da sessão ML, última coleta, taxa de fallback browser.
- **Múltiplas tags de afiliado:** Selecionar tag por canal/categoria.
- **Webhook de alerta:** Notificar quando sessão ML expirar (similar a QR WhatsApp).

---

## Guia rápido para o próximo agente

### Onde começar

1. Rodar `npm run ml:login` e validar que `storage-state.json` é criado.
2. Testar coleta HTTP: log deve mostrar `method: 'http'` em `http-scraper.ts`.
3. Forçar fallback: temporariamente quebrar URL ou setar `ML_USE_BROWSER_FALLBACK=true` com HTTP bloqueado.
4. **Prioridade máxima:** abrir DevTools no link-builder, capturar request `createLink` real, atualizar `affiliate-link.ts`.

### Arquivos-chave

| Arquivo | O que fazer aqui |
|---------|------------------|
| `src/mercado-livre/parser.ts` | Ajustar extração de produtos do HTML |
| `src/mercado-livre/affiliate-link.ts` | Endpoint createLink, seletores UI |
| `src/mercado-livre/session.ts` | Persistência e validação de sessão |
| `src/mercado-livre/http-scraper.ts` | URL de listagem, headers, retry |
| `src/offers/service.ts` | Regras de score — não mexer em scraping aqui |

### Comandos úteis

```bash
npm run ml:login    # login afiliado (navegador visível)
npm run dev         # collector
npm run worker      # whatsapp sender
npm run build       # verificar TypeScript
```

### ENV mínimo para testar

```env
ML_CATEGORIES=MLB1648
ML_AUTH_PATH=./data/ml_auth
AFFILIATE_CONFIG={"tag":"sua-tag-afiliado"}
ML_USE_BROWSER_FALLBACK=true
```
