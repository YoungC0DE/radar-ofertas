# Manager — Painel Web

Painel admin server-rendered em `manager/`. Sem framework frontend — HTML gerado em TypeScript.

## Acesso

```bash
npm run manager
# → http://localhost:3000/manager (porta via MANAGER_PORT)
```

Auth opcional: `MANAGER_TOKEN` exige `?token=...` ou header `Authorization: Bearer`.

## Páginas

| Rota | Descrição |
|------|-----------|
| `/manager` | Dashboard — status, coleta manual, envio imediato |
| `/manager/offers` | Lista de ofertas (filtro por status) |
| `/manager/offers/:id` | Detalhe da oferta + preview da mensagem |
| `/manager/settings` | Score, brand, horários, intervalos, fontes ML, conexões, worker |
| `/manager/template` | Editor de template WhatsApp |
| `/manager/logs` | Logs da aplicação (collector, worker, manager) |
| `/manager/health` | Health check (`ok`) |

## Estrutura MVC

```
manager/
├── server.ts           → entry point
├── routes/index.ts     → roteamento + auth
├── controllers/        → handlers (parse form, redirect, JSON APIs)
├── models/             → dados para views (importa src/)
└── views/              → HTML em TS (layout, dashboard, etc.)
```

## Settings editáveis

Tudo persiste na tabela `settings` e é lido pelos processos via cache:

- **Score** — tiers por desconto, avaliação, vendas, preço
- **Brand** — nome, subtítulo, logo (base64)
- **Horários** — janela operacional de envio
- **Intervalos** — coleta e delay entre envios
- **Fontes ML** — categorias do `.env` (ativar/desativar) + URLs customizadas
- **Canal** — invite link do WhatsApp
- **Template** — mensagem WhatsApp com placeholders
- **Links afiliado** — delay entre gerações e backoff quando há backlog (em `/manager/offers`)

## Conexões (via painel)

O painel gerencia autenticação sem depender só da CLI:

| Integração | Fluxo no painel | Persistência |
|------------|-----------------|--------------|
| WhatsApp | QR exibido em Settings → Conectar | `WHATSAPP_AUTH_PATH` |
| Mercado Livre | Abre navegador → login manual → "Salvar sessão" | `ML_AUTH_PATH` |

APIs JSON (usadas pelo frontend do painel):

| Endpoint | Método | Função |
|----------|--------|--------|
| `/manager/settings/connect/wa/start` | POST | Inicia pareamento WhatsApp |
| `/manager/settings/connect/wa/status` | GET | Status + QR |
| `/manager/settings/connect/ml/start` | POST | Abre navegador ML |
| `/manager/settings/connect/ml/finish` | POST | Salva sessão após login |
| `/manager/settings/connect/ml/cancel` | POST | Cancela fluxo ML |
| `/manager/settings/connect/ml/status` | GET | Status do fluxo ML |

> O painel desconecta o socket WhatsApp após salvar credenciais — o **worker** é o único processo que mantém conexão ativa para envio.

## Worker de envio (via painel)

O `npm run up` sobe collector + manager, **não** o worker — evita dois processos disputando a sessão WhatsApp.

| Endpoint | Método | Função |
|----------|--------|--------|
| `/manager/settings/worker/start` | POST | Inicia `npm run worker` |
| `/manager/settings/worker/stop` | POST | Encerra worker |
| `/manager/settings/worker/restart` | POST | Reinicia worker |
| `/manager/settings/worker/status` | GET | Status do processo |

## Logs

| Endpoint | Descrição |
|----------|-----------|
| `/manager/logs` | Página com filtros (nível, fonte, busca) |
| `/manager/api/logs` | JSON dos logs (Redis via `log-store.ts`) |

## Regras

- Manager **não** contém regra de negócio — delega para `src/`.
- `src/` nunca importa de `manager/`.
- Models do manager importam funções de `src/config/`, `src/offers/`, etc.

## Preflight

`npm run manager` executa `preflight --profile=manager` antes de subir (verifica DB, Redis, canal).
