# Amazon — Scraping e links de afiliado

Domínio `src/amazon/`. Coleta de ofertas em browse nodes, buscas e URLs de produto; links de afiliado via `?tag=` (sem sessão persistida).

## Visão geral

| Subsistema | Método principal | Fallback | Login |
|------------|------------------|----------|-------|
| Coleta de produtos | HTTP + parser HTML | Playwright | Não |
| Links de afiliado | Montagem de URL com `storeId` (`?tag=`) | Prefixo customizado opcional | Não |

Ofertas Amazon reutilizam o modelo `RawOffer`/`OfferRecord`: o ASIN fica em `mercado_livre_id` (campo genérico de ID de produto) e a plataforma é detectada em runtime por `offers/platform.ts`.

## Fontes de coleta

Gerenciadas por `config/amazon-sources-config.ts` (espelha o padrão do ML):

1. **`AMAZON_SOURCES` no `.env`** — browse nodes, buscas ou URLs de produto; ativar/desativar por canal no manager.
2. **URLs customizadas** — adicionadas em `/manager/sources/:channel`, persistidas em `amazonCustomSources`.

Tipos suportados (`amazon/source-url.ts`): browse node (`/b/node/...`), busca (`/s?k=...`), produto (`/dp/ASIN`).

## Coleta de produtos

### Fluxo HTTP (principal)

```
Fontes configuradas
    ↓
validateAmazonSourceConfig()
    ↓
fetchAmazonListingPage() / fetchAmazonSourceViaHttp()
    ↓
parser.ts → AmazonScrapedItem[]
    ↓
Enriquecimento opcional via PDP (fetchAmazonProductPage)
    ↓
mapToRawOffer() → RawOffer
```

Paginação: até 3 páginas por listagem (`MAX_SCRAPE_PAGES` em `amazon/index.ts`).

### Fluxo Playwright (fallback)

Ativado quando `AMAZON_USE_BROWSER_FALLBACK=true` e HTTP falha (403, captcha, HTML vazio) ou retorna zero itens na primeira página.

Arquivo: `browser-scraper.ts` — Chromium headless, sem pool dedicado (fallback pontual).

## Links de afiliado

Ordem em `amazon/affiliate-link.ts` / `offers/affiliate-link.ts`:

1. **`storeId`** — `https://www.amazon.com.br/dp/{ASIN}?tag={storeId}` (formato oficial).
2. **Prefixo customizado** — `AMAZON_AFFILIATE_LINK_PREFIX` ou valor editável no painel (Settings › Afiliados › Amazon).
3. **Passthrough** — URL do produto sem tag (último recurso).

Config runtime em `config/amazon-config-store.ts` (settings `amazonAffiliateConfig`):

| Campo | ENV fallback | Descrição |
|-------|--------------|-----------|
| `baseUrl` | `AMAZON_BASE_URL` | Site Amazon (default `.com.br`) |
| `storeId` | `AMAZON_AFFILIATE_STORE_ID` | Tag de tracking (ID da loja) |
| `affiliateLinkPrefix` | `AMAZON_AFFILIATE_LINK_PREFIX` | Prefixo opcional (não usar `link.amazon`) |

`buildOfferAffiliateLink()` em `offers/affiliate-link.ts` roteia Amazon vs Mercado Livre automaticamente.

## Roteamento de fontes

`src/sources/routing.ts` unifica ML e Amazon no collector:

- `getActiveSourcesForChannel()` — categorias ML + fontes Amazon ativas.
- `iterateSourcePages()` — delega para `iterateScrapedPages` (ML) ou `iterateAmazonScrapedPages` (Amazon).

## Variáveis de ambiente

| Variável | Default | Descrição |
|----------|---------|-----------|
| `AMAZON_BASE_URL` | `https://www.amazon.com.br/` | URL base do site |
| `AMAZON_AFFILIATE_STORE_ID` | (vazio) | ID da loja / tag de afiliado |
| `AMAZON_AFFILIATE_LINK_PREFIX` | (vazio) | Prefixo customizado opcional |
| `AMAZON_SOURCES` | (vazio) | URLs separadas por vírgula |
| `AMAZON_SCRAPER_USER_AGENT` | Chrome 131 | User-Agent das requisições |
| `AMAZON_USE_BROWSER_FALLBACK` | `true` | Ativa Playwright em falhas |
| `AMAZON_HTTP_TIMEOUT_MS` | `30000` | Timeout HTTP/browser |

## Manager

| Rota / seção | Função |
|--------------|--------|
| `/manager/sources/:channel` | Ativar/desativar fontes do `.env` + adicionar/remover links Amazon customizados |
| Settings › Afiliados › Amazon | Editar `baseUrl`, `storeId` e prefixo (`/manager/settings/amazon-affiliate`) |

## Registro de plataformas

`src/affiliates/registry.ts` lista plataformas de afiliado (`mercado_livre`, `amazon` ativas; `shopee` em breve). Usado no painel para exibir status das integrações.

## Template de mensagem

Ofertas Amazon reutilizam `offers/message-template.ts` com adaptações:

- `salesRank` armazena contagem de reviews (não ranking ML).
- Placeholder `top_sold` fica vazio para Amazon.
- `qty_sold` usa `soldQuantity` quando disponível.

## Arquivos por responsabilidade

| Arquivo | Responsabilidade |
|---------|------------------|
| `parser.ts` | Extrair produtos de HTML de listagem/PDP |
| `http-scraper.ts` | Fetch de listagens, buscas e PDP |
| `browser-scraper.ts` | Fallback Playwright |
| `source-url.ts` | Validação de URLs e tipos de fonte |
| `affiliate-link.ts` | Montagem de link com tag |
| `offer-hydration.ts` | Hidratação de campos faltantes no envio |
| `index.ts` | `iterateAmazonScrapedPages`, `searchConfiguredAmazonSources` |

## Limitações conhecidas

- Scraping sujeito a anti-bot (403, captcha) — mesmo padrão híbrido do ML.
- ASIN reutiliza coluna `mercado_livre_id` no banco (nome legado).
- Cupons ML não se aplicam a produtos Amazon.
- Shopee listada como `coming_soon` em `affiliates/registry.ts` — sem implementação.

## Documentação relacionada

- [Arquitetura](./architecture.md)
- [Mercado Livre — Scraping](./mercado-livre.md)
- [Filas](./queues.md)
- [Manager](./manager.md)
