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
  senderDelayMs: z.number().int().nonnegative().default(5000),
  maxPrice: z.number().positive().default(5000),
  minSoldQuantity: z.number().int().nonnegative().default(100),
  /** Hora de início da janela operacional (inclusiva, 0–23). Default: 9 = 09:00 */
  operatingHoursStart: z.number().int().min(0).max(23).default(9),
  /** Hora de fim da janela operacional (exclusiva). 0 = meia-noite (24:00) */
  operatingHoursEnd: z.number().int().min(0).max(24).default(0),
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
});

const envParse = envSchema.safeParse(process.env);

if (!envParse.success) {
  console.error('Invalid environment variables:', envParse.error.format());
  process.exit(1);
}

export const env = envParse.data;
export type Env = typeof env;
export type QueueConfig = z.infer<typeof queueConfigSchema>;
export type AffiliateConfig = z.infer<typeof affiliateConfigSchema>;
