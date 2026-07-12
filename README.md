# Radar Ofertas

Bot automatizado que coleta ofertas do Mercado Livre via scraping híbrido (HTTP + Playwright), pontua oportunidades e publica em canal WhatsApp via Baileys.

## Stack

Node.js, TypeScript, Cheerio, Playwright, Baileys, PostgreSQL, Redis, BullMQ, Docker, Prisma.

## Estrutura

```
src/
├── app.ts              → collector
├── worker.ts           → envio WhatsApp
├── ml-login.ts         → login afiliado ML
├── config/
├── whatsapp/
├── mercado-livre/
├── offers/
├── jobs/
├── queue/
├── database/
└── utils/
```

## Início rápido

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run migrate:deploy

# Sessão afiliado ML (uma vez)
npm run ml:login

# Terminal 1 — coleta
npm run dev

# Terminal 2 — envio WhatsApp
npm run worker
```

## Docker (produção)

```bash
docker compose up -d
docker compose logs -f worker   # escanear QR na primeira execução
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Processo collector (coleta + fila) |
| `npm run worker` | Processo worker (WhatsApp + envio) |
| `npm run ml:login` | Login afiliado ML (salva sessão) |
| `npm run wa:login` | Autentica WhatsApp (QR code) |
| `npm run wa:channel` | Consulta ID do canal pelo link de convite |
| `npm run e2e:test` | Teste ponta a ponta (coleta → envio WhatsApp) |
| `npm run migrate` | Prisma migrate dev |
| `npm run migrate:deploy` | Prisma migrate deploy |
| `npm run prisma:studio` | Prisma Studio |
| `npm run build` | Compilar TypeScript |

## Documentação

Consulte `.cursor/docs/` para arquitetura, filas, banco, WhatsApp, Mercado Livre e deploy.
