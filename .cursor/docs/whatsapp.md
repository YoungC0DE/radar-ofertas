# WhatsApp — Baileys

Conexão, eventos, reconexão e `sendOffer()` em `src/whatsapp/index.ts`; publisher em `src/channels/whatsapp-publisher.ts`.

- Sessão: `WHATSAPP_AUTH_PATH` (ou path da conta em `data/accounts/{id}/whatsapp/`)
- Canal: `WHATSAPP_CHANNEL_ID` (ou `config.channelId` da conta)
- Cache de canal: `whatsapp/channel-cache.ts` (nome, invite link)
- Formatação: `offers/message-template.ts` (template editável no manager)
- Apenas `worker.ts` mantém conexão Baileys ativa para envio
- Consome a fila `offer-sender` (ou `offer-sender-{accountId}`) — o Telegram tem a sua ([Canais](./channels.md))
- **Lock de dono:** arquivo `owner.lock` em `WHATSAPP_AUTH_PATH` — impede dois processos na mesma sessão (`connectionReplaced`)
- **QR/status no Redis:** worker publica em `radar:connect:wa:{accountId}`; painel lê e renderiza

## Ferramentas de setup

| Comando / Painel | Uso |
|------------------|-----|
| Settings → Conectar WhatsApp | QR no painel (lido do Redis, publicado pelo worker) |
| `npm run wa:login` | Autenticar WhatsApp via CLI |
| `npm run wa:channel` | Obter `WHATSAPP_CHANNEL_ID` pelo link de convite |

> O **worker** é dono da sessão. O painel não abre socket Baileys em produção — apenas exibe o QR que o worker publica no Redis. Dois processos com socket ativo causam `connectionReplaced`.

## Multi-conta

- Auth path por conta: `resolveAccountAuthPath(accountId, 'whatsapp')` em `accounts/paths.ts`
- Worker consome conta via `WORKER_ACCOUNT_ID` (default: `default`)
- Publisher carregado por `accounts/worker-publisher.ts`

## Template de mensagem

Placeholders disponíveis (editáveis em `/manager/template`):

| Placeholder | Descrição |
|-------------|-----------|
| `{{store}}` | Nome da loja (brand) |
| `{{name}}` | Nome do produto |
| `{{price}}` | Preço formatado |
| `{{avalia}}` | Avaliação |
| `{{qty_sold}}` | Quantidade vendida |
| `{{top_sold}}` | Ranking de vendas |
| `{{product_link}}` | Link de afiliado |

Template e visibilidade dos placeholders persistidos em `settings` (`messageTemplate`, `messageTemplatePlaceholders`).

## Posição no fluxo

Última etapa — recebe ofertas com link de afiliado já gerado:

```
offer-sender queue → jobs/sender → formatOfferMessage → sendOffer → canal WhatsApp
```

## Paralelo com sessão ML

| Integração | Pasta de sessão | Setup |
|------------|-----------------|-------|
| WhatsApp | `./data/auth_info_baileys` | Worker + painel (QR Redis) ou `npm run wa:login` |
| ML Afiliado | `./data/ml_auth` | Painel ou `npm run ml:login` |

Ambas montadas em `./data` no Docker Compose.
