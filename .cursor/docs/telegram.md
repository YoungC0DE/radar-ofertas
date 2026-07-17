# Telegram — Bot API

Envio em `src/telegram/index.ts` (Bot API pura sobre `fetch`, sem dependência nova) e publisher em `src/channels/telegram-publisher.ts`.

- Ligado por: `TELEGRAM_ENABLED`
- Credenciais: `TELEGRAM_BOT_TOKEN` (do @BotFather)
- Destino: `TELEGRAM_CHAT_ID` (`@seucanal` ou id `-100…`)
- Formatação: `offers/message-template.ts` — o **mesmo** template do WhatsApp
- Apenas `worker-telegram.ts` consome a fila `offer-sender-telegram`

## Setup

1. Crie o bot com o [@BotFather](https://t.me/BotFather) e copie o token
2. Adicione o bot como **administrador** do canal, com permissão de publicar
3. Preencha o `.env`:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=@meucanal
```

4. `npm run check` valida token, canal e permissão de admin

| Comando | Uso |
|---------|-----|
| `npm run worker:telegram` | Sobe o worker de envio do Telegram |
| Settings → Worker de envio — Telegram | Inicia/para o worker pelo painel |
| `npm run check` | Valida bot, canal e permissão de admin |

> Com `TELEGRAM_ENABLED=false`, nada é enfileirado para o Telegram e o worker encerra no boot (exit 0).

## Diferenças em relação ao WhatsApp

| | WhatsApp | Telegram |
|---|---|---|
| Conexão | Socket Baileys persistente | HTTP stateless (Bot API) |
| Sessão | `./data/auth_info_baileys` + lock de dono | Nenhuma — só o token |
| Réplicas | Apenas **uma** (`connectionReplaced`) | Várias são seguras |
| Setup | QR code | Token + bot admin do canal |
| Imagem | Baixamos os bytes e subimos | A API busca a URL sozinha |
| Limite de legenda | — | 1024 com foto, 4096 em texto |

Sem markup no envio (`parse_mode` ausente): o template é texto puro, então um `_` ou `*` vindo do título do produto não quebra a publicação.

## Posição no fluxo

```
offer-sender-telegram → jobs/sender (telegramPublisher) → sendOffer → canal Telegram
```

## Erros comuns

| Erro | Causa |
|------|-------|
| `chat not found` | `TELEGRAM_CHAT_ID` errado, ou bot nunca adicionado ao canal |
| `bot is not a member` / não é admin | Falta promover o bot a administrador |
| `429 Too Many Requests` | Flood control — o BullMQ retenta com backoff |
| `wrong file identifier/HTTP URL specified` | Telegram não conseguiu baixar a imagem → cai para texto |

## Documentação relacionada

- [Canais e envio](./channels.md)
- [WhatsApp](./whatsapp.md)
- [Filas](./queues.md)
