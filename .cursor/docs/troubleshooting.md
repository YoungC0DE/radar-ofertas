# Troubleshooting

Guia para problemas comuns de coleta, afiliado ML, anti-bot e processos.

## Health checks (API)

Endpoints públicos (sem JWT):

| Endpoint | Uso |
|----------|-----|
| `GET /api/v1/health` | DB + snapshot de collector/worker |
| `GET /api/v1/health/collector` | Heartbeat Redis do processo `collector` |
| `GET /api/v1/health/worker` | Heartbeat Redis do processo `worker` |

Respostas `503` em `/health/collector` ou `/health/worker` indicam processo parado, heartbeat expirado (>30s) ou Redis indisponível.

Em Docker, o collector publica heartbeat ao subir (`src/app.ts`). O worker publica por canal/conta via `startWorkerHeartbeatLoop` em `worker-runner.ts`.

## Sessão afiliado Mercado Livre expirada

### Sintomas

- Links de afiliado caem no fallback `matt_tool` / `matt_word` (não encurtados)
- Logs com `affiliate_source: fallback` ou alerta de sessão expirada
- Painel › Settings › Conexões — Mercado Livre com status de erro
- `npm run check` reporta sessão inválida

### Solução

1. **Dev local:** Settings › Conexões → login ML, ou `npm run ml:login`
2. **Docker:** `MANAGER_VNC_ENABLED=true` no serviço `api`, acesse noVNC e faça login pelo painel
3. Verifique que `ML_AUTH_PATH` (ou `data/accounts/{id}/mercado_livre/`) contém `storage-state.json` atualizado
4. Após login, teste gerando um link manualmente no portal afiliado

### Prevenção

- Renovação automática de cookies via GET no link-builder (`affiliate-link.ts`)
- Rate limit de 500ms entre gerações de link
- Monitorar logs — considere webhook futuro quando sessão expirar (ver Implementation Board)

## Anti-bot na coleta (HTTP 403, captcha, HTML vazio)

### Sintomas

- Collector enfileira jobs mas `enqueued: 0`
- Logs: `Blocked HTML`, `HTTP 403`, `circuit breaker open`
- `curl` em `lista.mercadolivre.com.br` retorna página de verificação (comportamento esperado fora do browser)

### Soluções

1. **`ML_USE_BROWSER_FALLBACK=true`** — Playwright como fallback (já default no Docker)
2. Ajuste **`ML_SCRAPER_USER_AGENT`** para um UA de browser real
3. Warm-up de cookies habilitado em `http-scraper.ts` — aguarde primeira coleta após boot
4. Reduza concorrência — collector usa `concurrency: 2` para fontes HTTP
5. Circuit breaker pausa tentativas após falhas repetidas — aguarde reset ou reinicie collector
6. Em volume alto: considere proxy rotativo (melhoria futura no board)

### Validar parser localmente

Testes usam fixtures HTML em `src/mercado-livre/fixtures/` (sem rede). Teste de integração com fetch mockado: `http-scraper.integration.test.ts`.

Para HTML real: capture a página **após** passar verificação no browser e salve como fixture — não dependa de `curl` direto na listagem.

## Endpoint `createLink` (links encurtados ML)

**Status:** validação manual pendente (prioridade alta no board).

### Como capturar o endpoint real

1. Faça login no [portal de afiliados ML](https://www.mercadolivre.com.br/afiliados/link-builder) com sessão válida
2. Abra DevTools → **Network** → filtre por `createLink` ou `affiliate`
3. Gere um link encurtado para um produto
4. Anote:
   - URL exata do POST/GET
   - Headers (`Cookie`, `x-csrf-token`, etc.)
   - Body JSON enviado
   - Formato da resposta (`short_url`, `urls[]`, etc.)
5. Compare com `CREATE_LINK_ENDPOINTS` em `src/mercado-livre/affiliate-link.ts`
6. Se diferente, adicione o endpoint correto **no início** do array (tentativa em ordem)
7. Ajuste seletores em `createLinkViaBrowser()` se o fallback Playwright falhar

### Seletores do link-builder (Playwright)

Função `createLinkViaBrowser()` — validar manualmente quando a UI do portal mudar. Use noVNC no Docker para inspecionar visualmente.

## Worker parado / ofertas pendentes

1. `GET /api/v1/health/worker` — deve retornar `status: ok`
2. Dev: Settings › Operações → **Iniciar**, ou `npm run worker`
3. Docker: `docker compose ps worker` e `docker compose logs -f worker`
4. WhatsApp: escaneie QR em Settings › Conexões; Redis necessário para QR no painel
5. Reconciliação: worker reconcilia jobs pendentes a cada 60s no boot

## Collector parado / sem coletas

1. `GET /api/v1/health/collector` — deve retornar `status: ok`
2. Verifique Redis e fila `offer-collector` no dashboard
3. Dev: `npm run dev` ou `npm run up`
4. Docker: serviço `collector` no compose
5. Janela operacional: coleta orchestrator respeita horários (exceto coleta manual com `force`)

## Redis desabilitado

`REDIS_ENABLED=false` — filas inline, sem QR WhatsApp no painel, sem heartbeat. Adequado apenas para testes isolados.

## Comandos úteis

```bash
npm run check                    # valida ambiente
curl http://localhost:3001/api/v1/health/collector
curl http://localhost:3001/api/v1/health/worker
docker compose logs -f collector worker
npm test                         # inclui testes de integração mockados
```

Ver também: [deployment.md](./deployment.md), [mercado-livre.md](./mercado-livre.md), [queues.md](./queues.md).
