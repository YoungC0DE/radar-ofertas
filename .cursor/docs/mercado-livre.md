# Mercado Livre — Scraping Híbrido

Domínio `src/mercado-livre/`. Coleta via scraping; links de afiliado via sessão autenticada persistida.

## Visão geral

| Subsistema | Método principal | Fallback | Login |
|------------|------------------|----------|-------|
| Coleta de produtos | HTTP + parser HTML/JSON | Playwright | Não |
| Links de afiliado | HTTP `createLink` + cookies | Playwright link-builder | Sim (`ml:login`) |

## Coleta de produtos

### Fluxo HTTP (principal)

```
ML_CATEGORIES
    ↓
buildCategoryListingUrl()  → lista.mercadolivre.com.br/_CategoryId_{id}
    ↓
fetch() com User-Agent configurável
    ↓
parser.ts                  → JSON embutido ou Cheerio (.ui-search-layout__item)
    ↓
ScrapedItem[] → RawOffer
```

`ML_CATEGORIES` aceita:
- IDs de categoria: `MLB1648` → URL `https://lista.mercadolivre.com.br/_CategoryId_MLB1648`
- URLs completas: `https://lista.mercadolivre.com.br/notebooks`

### Fluxo Playwright (fallback)

Ativado quando `ML_USE_BROWSER_FALLBACK=true` e HTTP falha (403, captcha, HTML vazio, zero produtos).

Arquivo: `browser-scraper.ts` — Chromium headless, mesmo parser.

## Sessão de afiliado (estilo Baileys)

Persistência em `ML_AUTH_PATH` (default: `./data/ml_auth/`):

```
ml_auth/
├── storage-state.json   → cookies + localStorage (formato Playwright)
└── session-meta.json    → lastLoginAt, lastRefreshAt, lastError
```

### Primeiro login

```bash
npm run ml:login
```

1. Abre navegador visível (`headless: false`).
2. Usuário faz login no portal de afiliados manualmente.
3. Usuário pressiona Enter no terminal quando o login estiver concluído.
4. Sessão salva em `storage-state.json`.

Repetir quando links deixarem de funcionar (sessão expirada).

## Geração de links de afiliado

Ordem de tentativa em `affiliate-link.ts`:

1. **HTTP** — POST nos endpoints internos `createLink` com cookies da sessão + `AFFILIATE_CONFIG.tag`.
2. **Playwright** — preenche link-builder no portal, extrai URL gerada, atualiza sessão.
3. **Fallback** — adiciona `matt_tool`/`matt_word` na URL (sem encurtamento).

Retorno preferido: link encurtado `mercadolivre.com/sec/...`.

`buildAffiliateLink()` é **async** — chamado em `offers/service.ts` durante `processOffer()`.

## Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `ML_AUTH_PATH` | `./data/ml_auth` | Pasta da sessão de afiliado |
| `ML_CATEGORIES` | `MLB1648` | IDs ou URLs separados por vírgula |
| `ML_SEARCH_LIMIT` | `50` | Máximo de produtos por categoria |
| `ML_SCRAPER_USER_AGENT` | Chrome 131 | User-Agent das requisições |
| `ML_USE_BROWSER_FALLBACK` | `true` | Ativa Playwright em falhas |
| `ML_BROWSER_HEADLESS` | `true` | Browser invisível no fallback |
| `ML_HTTP_TIMEOUT_MS` | `30000` | Timeout HTTP/browser |
| `AFFILIATE_CONFIG` | `{}` | JSON: `tag`, `baseUrl` |

## Exports públicos (`index.ts`)

```typescript
searchConfiguredCategories(): Promise<RawOffer[]>
buildAffiliateLink(permalink: string): Promise<string>
```

## Limitações conhecidas

- Endpoint `createLink` é interno e pode mudar sem aviso.
- Seletores do link-builder podem quebrar com redesign do portal.
- Paginação não implementada — apenas primeira página por categoria.
- Sessão expira — requer `npm run ml:login` periodicamente.
- Scraping sujeito a anti-bot (403, captcha).

## Arquivos por responsabilidade

| Arquivo | Responsabilidade |
|---------|------------------|
| `parser.ts` | Extrair produtos de HTML (JSON embutido + Cheerio) |
| `http-scraper.ts` | Fetch de listagens |
| `browser-scraper.ts` | Fallback Playwright para coleta |
| `session.ts` | Load/save cookies, validação de sessão |
| `affiliate-link.ts` | Geração de links (HTTP → browser → fallback) |
| `auth.ts` | Fluxo de login manual |

## Para o próximo agente

Prioridades no board: validar endpoint `createLink` real via DevTools, ajustar seletores do link-builder, implementar paginação e retry com backoff.
