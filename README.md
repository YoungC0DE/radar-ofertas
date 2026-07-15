# Radar Ofertas

Bot automatizado que coleta ofertas do Mercado Livre via scraping híbrido (HTTP + Playwright), pontua oportunidades, gera links de afiliado e publica em canal WhatsApp via Baileys. Inclui painel web **manager** para configurar score, template, horários, conexões e worker.

## Stack

Node.js, TypeScript, Cheerio, Playwright, Baileys, PostgreSQL, Redis, BullMQ, Docker, Prisma.

## Estrutura

```
src/
├── app.ts              → collector (coleta + enfileira)
├── worker.ts           → envio WhatsApp
├── ml-login.ts         → login afiliado ML (CLI)
├── wa-login.ts         → login WhatsApp (CLI)
├── config/             → ENV (Zod) + settings DB
├── whatsapp/           → Baileys + channel-cache
├── mercado-livre/      → scraping + sessão afiliado
├── offers/             → domínio de ofertas + template
├── jobs/               → workers BullMQ
├── queue/              → filas Redis + agendamento
├── database/           → Prisma
├── scripts/            → preflight, up
└── utils/              → logger, log-store

manager/                → painel web (MVC server-rendered)
```

## Início rápido

```bash
cp .env.example .env
docker compose up -d postgres redis
npm install
npm run prisma:generate
npm run migrate:deploy

# Valida ambiente e mostra o que falta
npm run check

# Sobe collector + manager (worker é iniciado pelo painel)
npm run up
```

Abra `http://localhost:3000/manager` e configure:

1. **Conexões** — WhatsApp (QR) e Mercado Livre (login afiliado no navegador).
2. **Worker de envio** — iniciar/reiniciar o processo que publica no canal.
3. **Score, template, horários** — regras operacionais (persistidas no banco).

Alternativa via CLI (sem painel):

```bash
npm run ml:login    # sessão afiliado ML
npm run wa:login    # sessão WhatsApp
npm run dev         # collector
npm run worker      # envio WhatsApp
```

## Docker (produção)

```bash
cp .env.example .env
# Editar .env com WHATSAPP_CHANNEL_ID, AFFILIATE_CONFIG, etc.

docker compose up -d --build
```

| Serviço | Função |
|---------|--------|
| `postgres` / `redis` | Infraestrutura |
| `migrate` | Aplica migrations automaticamente |
| `app` | Collector |
| `worker` | Envio WhatsApp |
| `manager` | Painel em `http://localhost:3000/manager` |

```bash
docker compose logs -f worker   # QR na primeira execução (se sessão não existir)
docker compose restart worker   # reiniciar envio
```

Sessões persistidas em `./data` (volume montado nos containers).

O manager não está no docker-compose — rode separadamente com `npm run manager` se precisar do painel.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run up` | Collector + manager (preflight automático) |
| `npm run check` | Valida ambiente (DB, Redis, sessões, canal) |
| `npm run setup` | Preflight + guia de setup |
| `npm run dev` | Processo collector (coleta + fila) |
| `npm run worker` | Processo worker (WhatsApp + envio) |
| `npm run manager` | Painel web admin em `/manager` |
| `npm run ml:login` | Login afiliado ML (salva sessão) |
| `npm run wa:login` | Autentica WhatsApp (QR code) |
| `npm run wa:channel` | Consulta ID do canal pelo link de convite |
| `npm run e2e:test` | Teste ponta a ponta (coleta → envio WhatsApp) |
| `npm run migrate` | Prisma migrate dev |
| `npm run migrate:deploy` | Prisma migrate deploy |
| `npm run test` | Testes unitários |
| `npm run build` | Compilar TypeScript |

## Documentação

Consulte `.cursor/docs/` para arquitetura, filas, banco, WhatsApp, Mercado Livre, manager e deploy.

| Doc | Conteúdo |
|-----|----------|
| [architecture.md](.cursor/docs/architecture.md) | Visão geral e fluxo |
| [manager.md](.cursor/docs/manager.md) | Painel web |
| [database.md](.cursor/docs/database.md) | Schema e settings |
| [queues.md](.cursor/docs/queues.md) | BullMQ e agendamento |
| [whatsapp.md](.cursor/docs/whatsapp.md) | Baileys e template |
| [mercado-livre.md](.cursor/docs/mercado-livre.md) | Scraping e afiliado |
| [deployment.md](.cursor/docs/deployment.md) | Docker e produção |
