# WhatsApp — Baileys

Tudo em `src/whatsapp/index.ts`: conexão, eventos, reconexão e `sendOffer()`.

- Sessão: `WHATSAPP_AUTH_PATH`
- Canal: `WHATSAPP_CHANNEL_ID`
- Formatação de mensagem: `offers/service.ts`
- Apenas `worker.ts` instancia conexão

## Ferramentas de setup

| Comando | Uso |
|---------|-----|
| `npm run wa:login` | Autenticar WhatsApp (QR code) |
| `npm run wa:channel` | Obter `WHATSAPP_CHANNEL_ID` pelo link de convite do canal |

## Posição no fluxo

Última etapa — recebe ofertas com link de afiliado já gerado via scraping/sessão ML:

```
offer-sender queue → jobs/sender → formatOfferMessage → sendOffer → canal WhatsApp
```

## Paralelo com sessão ML

| Integração | Pasta de sessão | Setup |
|------------|-----------------|-------|
| WhatsApp | `./data/auth_info_baileys` | QR no `npm run worker` |
| ML Afiliado | `./data/ml_auth` | Login no `npm run ml:login` |

Ambas montadas em `./data` no Docker Compose.
