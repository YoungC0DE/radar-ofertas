# WhatsApp — Baileys

Conexão, eventos, reconexão e `sendOffer()` em `src/whatsapp/index.ts`.

- Sessão: `WHATSAPP_AUTH_PATH`
- Canal: `WHATSAPP_CHANNEL_ID`
- Cache de canal: `whatsapp/channel-cache.ts` (nome, invite link)
- Formatação: `offers/message-template.ts` (template editável no manager)
- Apenas `worker.ts` instancia conexão Baileys

## Ferramentas de setup

| Comando | Uso |
|---------|-----|
| `npm run wa:login` | Autenticar WhatsApp (QR code) |
| `npm run wa:channel` | Obter `WHATSAPP_CHANNEL_ID` pelo link de convite do canal |

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
| WhatsApp | `./data/auth_info_baileys` | `npm run wa:login` |
| ML Afiliado | `./data/ml_auth` | `npm run ml:login` |

Ambas montadas em `./data` no Docker Compose.
