import { telegramPublisher } from '../channels/telegram-publisher.js';
import { env } from '../config/env.js';
import { prisma } from '../database/client.js';
import { buildMlCategoryRows, hydrateMlSourcesCache } from '../config/ml-sources-config.js';
import { hasValidSession, loadSessionMeta, loadStorageState } from '../mercado-livre/session.js';
import { getCollectorQueue, isRedisEnabled } from '../queue/index.js';
import { formatIsoInTimezone } from '../utils/datetime.js';

export type PreflightProfile = 'all' | 'collector' | 'worker' | 'worker-telegram' | 'manager';

export interface PreflightItem {
  ok: boolean;
  label: string;
  detail: string;
  fix?: string;
}

export interface PreflightResult {
  ok: boolean;
  items: PreflightItem[];
}

function maskUrl(url: string): string {
  return url.replace(/\/\/([^:@/]+):([^@/]+)@/, '//$1:***@');
}

function databaseFixHint(message: string): string {
  if (message.includes('database system is starting up')) {
    return 'O PostgreSQL remoto ainda está iniciando ou em recovery. Aguarde 1–2 min e rode npm run check de novo. Se persistir, verifique o serviço/container no servidor.';
  }
  if (message.includes('does not support TLS') || message.includes('TLS handshake')) {
    return 'Adicione ?sslmode=disable na DATABASE_URL (servidor sem SSL).';
  }
  return 'Confira DATABASE_URL e rode: npm run migrate:deploy';
}

async function checkDatabase(): Promise<PreflightItem> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { ok: true, label: 'PostgreSQL', detail: maskUrl(env.DATABASE_URL) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      label: 'PostgreSQL',
      detail: message,
      fix: databaseFixHint(message),
    };
  }
}

async function checkRedis(): Promise<PreflightItem> {
  if (!isRedisEnabled()) {
    return {
      ok: false,
      label: 'Redis',
      detail: 'REDIS_ENABLED=false — collector e worker precisam do Redis',
      fix: 'Defina REDIS_ENABLED=true e REDIS_URL no .env',
    };
  }

  const queue = getCollectorQueue();
  try {
    await queue.getJobCounts('waiting');
    return { ok: true, label: 'Redis', detail: maskUrl(env.REDIS_URL) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      label: 'Redis',
      detail: message,
      fix: 'Confira REDIS_URL no .env',
    };
  } finally {
    await queue.close();
  }
}

async function checkMercadoLivre(): Promise<PreflightItem> {
  const state = await loadStorageState();
  const meta = await loadSessionMeta();

  if (!state || !hasValidSession(state)) {
    return {
      ok: false,
      label: 'Mercado Livre (afiliado)',
      detail: meta.lastError ?? 'Sem sessão válida',
      fix: 'npm run ml:login',
    };
  }

  return {
    ok: true,
    label: 'Mercado Livre (afiliado)',
    detail: meta.lastLoginAt
      ? `Login em ${formatIsoInTimezone(meta.lastLoginAt, env.APP_TIMEZONE)}`
      : 'Sessão OK',
  };
}

async function checkTelegram(): Promise<PreflightItem> {
  if (!env.TELEGRAM_ENABLED) {
    return {
      ok: true,
      label: 'Telegram',
      detail: 'Desabilitado (TELEGRAM_ENABLED=false) — nada será enviado ao Telegram',
    };
  }

  const result = await telegramPublisher.verify();
  if (!result.ok) {
    return {
      ok: false,
      label: 'Telegram',
      detail: result.detail,
      fix: 'Crie o bot no @BotFather, adicione-o como admin do canal e preencha TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no .env',
    };
  }

  return { ok: true, label: 'Telegram', detail: result.detail };
}

async function checkAffiliateTag(): Promise<PreflightItem> {
  const tag = env.AFFILIATE_CONFIG.tag;
  if (!tag) {
    return {
      ok: false,
      label: 'Tag afiliado',
      detail: 'AFFILIATE_CONFIG.tag vazio',
      fix: 'Defina AFFILIATE_CONFIG={"tag":"sua-tag"} no .env',
    };
  }
  return { ok: true, label: 'Tag afiliado', detail: tag };
}

async function checkCategories(): Promise<PreflightItem> {
  await hydrateMlSourcesCache();
  // Ativa = alimenta ao menos um canal.
  const rows = buildMlCategoryRows().filter((row) => row.channels.length > 0);
  const invalid = rows.filter((row) => !row.valid);

  if (invalid.length > 0) {
    return {
      ok: false,
      label: 'Categorias ML',
      detail: `${invalid.length} inválida(s): ${invalid.map((c) => c.category).join(', ')}`,
      fix: 'Ajuste ML_CATEGORIES no .env ou remova links extras inválidos no painel',
    };
  }

  const envCount = rows.filter((row) => row.fromEnv).length;
  const customCount = rows.filter((row) => !row.fromEnv).length;

  return {
    ok: true,
    label: 'Categorias ML',
    detail: `${rows.length} ativa(s) — ${envCount} do .env, ${customCount} extra(s)`,
  };
}

async function runChecks(profile: PreflightProfile): Promise<PreflightItem[]> {
  const items: PreflightItem[] = [];

  items.push(await checkDatabase());

  if (profile === 'all' || profile === 'collector' || profile === 'worker' || profile === 'worker-telegram') {
    items.push(await checkRedis());
  }

  if (profile === 'all' || profile === 'collector' || profile === 'manager') {
    items.push(await checkCategories());
  }

  if (profile === 'all' || profile === 'worker-telegram') {
    items.push(await checkTelegram());
  }

  if (profile === 'all' || profile === 'collector') {
    items.push(await checkMercadoLivre());
    items.push(await checkAffiliateTag());
  }

  return items;
}

export function printPreflight(items: PreflightItem[]): void {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║     Radar Ofertas — Verificação      ║');
  console.log('╚══════════════════════════════════════╝\n');

  for (const item of items) {
    const icon = item.ok ? '✓' : '✗';
    console.log(`${icon} ${item.label}`);
    console.log(`  ${item.detail}`);
    if (!item.ok && item.fix) {
      console.log(`  → ${item.fix}`);
    }
    console.log('');
  }
}

export function printSetupGuide(): void {
  console.log('═══ Setup completo (rode na ordem) ═══\n');
  console.log('  npm install');
  console.log('  npm run prisma:generate');
  console.log('  npm run migrate:deploy');
  console.log('  npm run ml:login          # login afiliado ML');
  console.log('  npm run wa:login          # QR code WhatsApp');
  console.log('  npm run wa:channel -- "https://whatsapp.com/channel/..."');
  console.log('  npm run check             # verificar tudo');
  console.log('  npm run up                # subir collector + worker + manager\n');
  console.log('Telegram (opcional): crie o bot no @BotFather, adicione-o como admin do');
  console.log('canal e defina TELEGRAM_ENABLED/TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID no .env.\n');
}

export async function runPreflight(profile: PreflightProfile = 'all'): Promise<PreflightResult> {
  const items = await runChecks(profile);
  const ok = items.every((item) => item.ok);
  return { ok, items };
}

function parseProfile(argv: string[]): PreflightProfile {
  const arg = argv.find((a) => a.startsWith('--profile='));
  const value = arg?.split('=')[1];
  if (value === 'collector' || value === 'worker' || value === 'worker-telegram' || value === 'manager') {
    return value;
  }
  return 'all';
}

async function main(): Promise<void> {
  if (process.env.RADAR_SKIP_PREFLIGHT === '1') {
    return;
  }

  const guide = process.argv.includes('--guide');
  if (guide) {
    printSetupGuide();
    return;
  }

  const profile = parseProfile(process.argv);
  const result = await runPreflight(profile);
  printPreflight(result.items);

  if (!result.ok) {
    console.log('Corrija os itens acima antes de continuar.\n');
    printSetupGuide();
    process.exit(1);
  }

  console.log('Tudo OK — pode subir o bot.\n');
}

const isDirectRun = process.argv[1]?.includes('preflight');
if (isDirectRun) {
  main()
    .catch((error) => {
      console.error(error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
