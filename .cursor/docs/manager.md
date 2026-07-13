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
| `/manager/settings` | Score, brand, horários, intervalos, canal |
| `/manager/template` | Editor de template WhatsApp |
| `/manager/health` | Health check (`ok`) |

## Estrutura MVC

```
manager/
├── server.ts           → entry point
├── routes/index.ts     → roteamento + auth
├── controllers/        → handlers (parse form, redirect)
├── models/             → dados para views (importa src/)
└── views/              → HTML em TS (layout, dashboard, etc.)
```

## Settings editáveis

Tudo persiste na tabela `settings` e é lido pelos processos via cache:

- **Score** — tiers por desconto, avaliação, vendas, preço
- **Brand** — nome, subtítulo, logo (base64)
- **Horários** — janela operacional de envio
- **Intervalos** — coleta e delay entre envios
- **Canal** — invite link do WhatsApp
- **Template** — mensagem WhatsApp com placeholders

## Regras

- Manager **não** contém regra de negócio — delega para `src/`.
- `src/` nunca importa de `manager/`.
- Models do manager importam funções de `src/config/`, `src/offers/`, etc.

## Preflight

`npm run manager` executa `preflight --profile=manager` antes de subir (verifica DB, Redis, canal).
