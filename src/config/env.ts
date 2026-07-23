import { z } from 'zod';
import { isValidTimezone } from '../utils/datetime.js';

const affiliateConfigSchema = z.object({
  tag: z.string().default(''),
  baseUrl: z.string().url().default('https://www.mercadolivre.com.br'),
});

const queueConfigSchema = z.object({
  collectorIntervalMinutes: z.number().int().positive().default(15),
  minScore: z.number().int().nonnegative().default(50),
  senderConcurrency: z.number().int().positive().default(1),
  senderDelayMinutes: z.number().int().nonnegative().default(15),
  senderDelayMs: z.number().int().nonnegative().optional(),
  maxPrice: z.number().positive().default(5000),
  minSoldQuantity: z.number().int().nonnegative().default(100),
  /** Hora de início da janela operacional (inclusiva, 0–23). Default: 9 = 09:00 */
  operatingHoursStart: z.number().int().min(0).max(23).default(9),
  /** Hora de fim da janela operacional (exclusiva). 0 = meia-noite (24:00) */
  operatingHoursEnd: z.number().int().min(0).max(24).default(0),
  affiliateLinkDelayMs: z.number().int().nonnegative().default(500),
  affiliateLinkBacklogDelayMinutes: z.number().int().positive().default(2),
  affiliateLinkBacklogThreshold: z.number().int().positive().default(5),
});

const envSchema = z.object({
  NODE_ENV: z.enum(['local', 'production']).default('local'),
  APP_TIMEZONE: z
    .string()
    .default('America/Sao_Paulo')
    .refine(isValidTimezone, { message: 'APP_TIMEZONE must be a valid IANA timezone' }),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().min(1),
  WHATSAPP_CHANNEL_ID: z.string().min(1),
  WHATSAPP_AUTH_PATH: z.string().default('./data/auth_info_baileys'),
  TELEGRAM_ENABLED: z
    .string()
    .default('false')
    .transform((val) => val === 'true' || val === '1'),
  TELEGRAM_BOT_TOKEN: z.string().default(''),
  /** @meucanal, -100... (supergrupo/canal) ou id numérico do chat */
  TELEGRAM_CHAT_ID: z.string().default(''),
  TELEGRAM_API_TIMEOUT_MS: z.coerce.number().int().positive().default(20_000),
  ML_AUTH_PATH: z.string().default('./data/ml_auth'),
  ML_CATEGORIES: z
    .string()
    .default('MLB1648')
    .transform((val) => val.split(',').map((c) => c.trim()).filter(Boolean)),
  ML_SEARCH_LIMIT: z.coerce.number().int().positive().default(50),
  ML_SCRAPER_USER_AGENT: z
    .string()
    .default(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    ),
  ML_USE_BROWSER_FALLBACK: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
  ML_BROWSER_HEADLESS: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
  ML_HTTP_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  ML_COUPONS_URL: z
    .string()
    .url()
    .default('https://www.mercadolivre.com.br/afiliados/coupons#hub'),
  AFFILIATE_CONFIG: z
    .string()
    .default('{}')
    .transform((val, ctx) => {
      try {
        const parsed: unknown = JSON.parse(val);
        return affiliateConfigSchema.parse(parsed);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'AFFILIATE_CONFIG must be valid JSON' });
        return z.NEVER;
      }
    }),
  QUEUE_CONFIG: z
    .string()
    .default('{}')
    .transform((val, ctx) => {
      try {
        const parsed: unknown = JSON.parse(val);
        return queueConfigSchema.parse(parsed);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'QUEUE_CONFIG must be valid JSON' });
        return z.NEVER;
      }
    }),
  REDIS_ENABLED: z
    .string()
    .default('true')
    .transform((val) => val === 'true' || val === '1'),
  MANAGER_PORT: z.coerce.number().int().positive().default(3000),
  MANAGER_TOKEN: z.string().optional(),
})
  // Só exigimos as credenciais do Telegram quando o canal está ligado: quem roda
  // apenas o WhatsApp não precisa preencher nada no .env.
  .superRefine((value, ctx) => {
    if (!value.TELEGRAM_ENABLED) return;

    if (!value.TELEGRAM_BOT_TOKEN) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_BOT_TOKEN'],
        message: 'TELEGRAM_BOT_TOKEN é obrigatório quando TELEGRAM_ENABLED=true — pegue o token com o @BotFather',
      });
    }

    if (!value.TELEGRAM_CHAT_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['TELEGRAM_CHAT_ID'],
        message: 'TELEGRAM_CHAT_ID é obrigatório quando TELEGRAM_ENABLED=true — use @seucanal ou o id numérico',
      });
    }
  });

export type Env = z.infer<typeof envSchema>;
export type QueueConfig = z.infer<typeof queueConfigSchema>;
export type AffiliateConfig = z.infer<typeof affiliateConfigSchema>;

let _parsed: Env | undefined;

function resolveEnv(): Env {
  if (_parsed) return _parsed;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:', result.error.format());
    process.exit(1);
  }
  _parsed = result.data;
  return _parsed;
}

/**
 * Lazy: o parse só roda no primeiro acesso a uma propriedade, não no import.
 * Isso permite que testes importem módulos que dependem de env sem precisar
 * de .env no runner — desde que o teste não acesse env diretamente.
 */
export const env: Env = new Proxy({} as Env, {
  get(_, prop) {
    return (resolveEnv() as Record<string | symbol, unknown>)[prop];
  },
  has(_, prop) {
    return prop in resolveEnv();
  },
  ownKeys() {
    return Reflect.ownKeys(resolveEnv());
  },
  getOwnPropertyDescriptor(_, prop) {
    return Object.getOwnPropertyDescriptor(resolveEnv(), prop);
  },
});

/** Injeta um env fake para testes. Passar undefined restaura o parse real. */
export function setEnvForTest(fake: Env | undefined): void {
  _parsed = fake;
}
