# Radar Ofertas

Bot automatizado que coleta ofertas do Mercado Livre via scraping híbrido (HTTP + Playwright), pontua oportunidades, gera links de afiliado e publica em canal **WhatsApp** (Baileys) e **Telegram** (Bot API). Cada canal roda no seu próprio processo, com fila própria. Inclui painel web **manager** para configurar score, template, horários, conexões e workers.

## Stack

Node.js, TypeScript, Cheerio, Playwright, Baileys, PostgreSQL, Redis, BullMQ, Docker, Prisma.

## Estrutura

```
src/
├── app.ts              → collector (coleta + enfileira)
├── worker.ts           → envio WhatsApp
├── worker-telegram.ts  → envio Telegram
├── ml-login.ts         → login afiliado ML (CLI)
├── wa-login.ts         → login WhatsApp (CLI)
├── config/             → ENV (Zod) + settings DB
├── channels/           → contrato de canal + publishers
├── whatsapp/           → Baileys + channel-cache
├── telegram/           → Bot API (fetch)
├── mercado-livre/      → scraping + sessão afiliado
├── offers/             → domínio de ofertas + template
├── jobs/               → workers BullMQ (sender genérico por canal)
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
2. **Workers de envio** — iniciar/reiniciar os processos que publicam nos canais.
3. **Score, template, horários** — regras operacionais (persistidas no banco).

Alternativa via CLI (sem painel):

```bash
npm run ml:login         # sessão afiliado ML
npm run wa:login         # sessão WhatsApp
npm run dev              # collector
npm run worker           # envio WhatsApp
npm run worker:telegram  # envio Telegram (se TELEGRAM_ENABLED=true)
```

### Telegram (opcional)

O Telegram é um canal separado, desligado por padrão. Para ligar:

1. Crie o bot no [@BotFather](https://t.me/BotFather) e copie o token
2. Adicione o bot como **administrador** do seu canal, com permissão de publicar
3. No `.env`:

```bash
TELEGRAM_ENABLED=true
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=@meucanal      # ou o id -100... de canal privado
```

`npm run check` valida token, canal e permissão de admin. Com `TELEGRAM_ENABLED=false`, nada é enfileirado para o Telegram e o worker encerra no boot.

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
| `collector` | Coleta de ofertas (singleton; Playwright pooled) |
| `scheduler` | Mensagens automáticas programadas (leve, sem browser) |
| `worker` | Envio WhatsApp (`WORKER_ACCOUNT_ID` opcional; 1 réplica por sessão) |
| `worker-telegram` | Envio Telegram (encerra com exit 0 se `TELEGRAM_ENABLED=false`) |
| `manager` | Painel em `http://localhost:3000/manager` (stateless, `MANAGER_CAN_SPAWN_WORKERS=false`) |

```bash
docker compose logs -f worker            # QR na primeira execução (se sessão não existir)
docker compose restart worker            # reiniciar envio WhatsApp
docker compose logs -f worker-telegram   # envios no Telegram
```

Não escale o `worker` além de uma réplica por número WhatsApp — a sessão Baileys só admite um dono. Para contas adicionais, use `docker-compose.accounts.example.yml` como base de `docker-compose.override.yml`.

Sessões persistidas em `./data` (volume montado nos containers), incluindo `data/accounts/{id}/` para multi-conta.

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run up` | Collector + scheduler + manager (preflight automático) |
| `npm run check` | Valida ambiente (DB, Redis, sessões, canais) |
| `npm run setup` | Preflight + guia de setup |
| `npm run dev` | Processo collector (coleta + fila) |
| `npm run scheduler` | Agendador de mensagens automáticas |
| `npm run worker` | Processo worker (WhatsApp + envio) |
| `npm run worker:telegram` | Processo worker (Telegram + envio) |
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

Consulte `.cursor/docs/` para arquitetura, canais de envio, filas, banco, WhatsApp, Telegram, Mercado Livre, manager e deploy.

| Doc | Conteúdo |
|-----|----------|
| [architecture.md](.cursor/docs/architecture.md) | Visão geral e fluxo |
| [manager.md](.cursor/docs/manager.md) | Painel web |
| [database.md](.cursor/docs/database.md) | Schema e settings |
| [queues.md](.cursor/docs/queues.md) | BullMQ e agendamento |
| [whatsapp.md](.cursor/docs/whatsapp.md) | Baileys e template |
| [mercado-livre.md](.cursor/docs/mercado-livre.md) | Scraping e afiliado |
| [deployment.md](.cursor/docs/deployment.md) | Docker e produção |
