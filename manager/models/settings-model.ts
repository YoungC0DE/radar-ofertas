import {
  getCollectorIntervalMinutes,
  getOperatingHoursStart,
  getOperatingHoursEnd,
  getSenderDelayMinutesFromDb,
  hydrateQueueConfigCache,
  saveCollectorIntervalMinutes,
  saveOperatingHours,
  saveSenderDelayMinutes,
} from '../../src/config/queue-config-store.js';
import { runSave } from './shared/save-result.js';
import {
  describeScoreRules,
  getRuntimeScoreConfigAsync,
  parseScoreConfigFromForm,
  saveScoreConfig,
  type ScoreConfig,
} from '../../src/config/score-config.js';
import {
  getCouponsUrlFromDb,
  hydrateCouponsConfigCache,
  saveCouponsUrl,
} from '../../src/config/coupons-config-store.js';
import { env } from '../../src/config/env.js';
import { isWithinOperatingHours } from '../../src/utils/datetime.js';
import { isRedisEnabled, rescheduleCollectorJob } from '../../src/queue/index.js';
import {
  resolveWhatsAppChannelInviteLink,
  resolveWhatsAppChannelName,
  saveWhatsAppChannelInviteLink,
} from '../../src/whatsapp/channel-cache.js';
import {
  getBrandInitial,
  getBrandLogoHref,
  getBrandSettings,
  hydrateBrandCache,
  saveBrandSettings,
} from './brand-model.js';
import { isPlaceholderChannelId } from '../../src/whatsapp/index.js';
import {
  getMercadoLivreSessionStatus,
  getTelegramSessionStatus,
  getWhatsAppSessionStatus,
  type SessionStatus,
} from './session-model.js';
import {
  getWorkerState,
  canManagerSpawnWorkers,
  listWorkerStates,
  type WorkerState,
  type AccountWorkerState,
} from './process-model.js';

export type SettingsSaveType = 'channel' | 'interval' | 'brand' | 'score' | 'hours' | 'senderDelay' | 'mlSources' | 'couponsUrl' | null;

export interface SettingsData {
  timezone: string;
  operatingHours: { start: number; end: number };
  operatingHoursLabel: string;
  withinOperatingHours: boolean;
  minScore: number;
  scoreConfig: ScoreConfig;
  scoreRulesSummary: string[];
  collectorIntervalMinutes: number;
  senderDelayMinutes: number;
  channelId: string;
  channelName: string | null;
  channelInviteLink: string;
  brandName: string;
  brandSubtitle: string;
  brandLogoHref: string | null;
  brandInitial: string;
  mlSession: SessionStatus;
  waSession: SessionStatus;
  telegramEnabled: boolean;
  telegramChatId: string;
  tgSession: SessionStatus | null;
  workerState: WorkerState;
  whatsappWorkers: AccountWorkerState[];
  telegramWorkerState: WorkerState;
  telegramWorkers: AccountWorkerState[];
  canSpawnWorkers: boolean;
  mlCouponsUrl: string;
  saved: SettingsSaveType;
  error: string | null;
}

function formatOperatingHours(start: number, end: number): string {
  const endLabel = end === 0 ? '24:00' : `${String(end).padStart(2, '0')}:00`;
  return `${String(start).padStart(2, '0')}:00 – ${endLabel}`;
}

export async function loadSettingsData(
  saved: SettingsSaveType = null,
  error: string | null = null,
): Promise<SettingsData> {
  await Promise.all([hydrateQueueConfigCache(), hydrateBrandCache(), hydrateCouponsConfigCache()]);
  const scoreConfig = await getRuntimeScoreConfigAsync();
  const senderDelayMinutes = await getSenderDelayMinutesFromDb();
  const [mlSession, waSession, tgSession] = await Promise.all([
    getMercadoLivreSessionStatus(),
    getWhatsAppSessionStatus(),
    env.TELEGRAM_ENABLED ? getTelegramSessionStatus() : Promise.resolve(null),
  ]);
  const operatingHours = {
    start: getOperatingHoursStart(),
    end: getOperatingHoursEnd(),
  };

  const channelId = env.WHATSAPP_CHANNEL_ID;
  let channelName: string | null = null;
  let channelInviteLink = '';

  if (channelId && !isPlaceholderChannelId(channelId)) {
    channelName = await resolveWhatsAppChannelName(channelId);
    channelInviteLink = (await resolveWhatsAppChannelInviteLink(channelId)) ?? '';
  }

  const brand = getBrandSettings();
  const mlCouponsUrl = await getCouponsUrlFromDb();
  const whatsappWorkers = await listWorkerStates('whatsapp');
  const telegramWorkers = env.TELEGRAM_ENABLED ? await listWorkerStates('telegram') : [];

  return {
    timezone: env.APP_TIMEZONE,
    operatingHours,
    operatingHoursLabel: formatOperatingHours(operatingHours.start, operatingHours.end),
    withinOperatingHours: isWithinOperatingHours(env.APP_TIMEZONE, {
      startHour: operatingHours.start,
      endHour: operatingHours.end,
    }),
    minScore: scoreConfig.minScore,
    scoreConfig,
    scoreRulesSummary: describeScoreRules(scoreConfig),
    collectorIntervalMinutes: getCollectorIntervalMinutes(),
    senderDelayMinutes,
    channelId,
    channelName,
    channelInviteLink,
    brandName: brand.name,
    brandSubtitle: brand.subtitle,
    brandLogoHref: getBrandLogoHref(brand),
    brandInitial: getBrandInitial(brand.name),
    mlSession,
    waSession,
    telegramEnabled: env.TELEGRAM_ENABLED,
    telegramChatId: env.TELEGRAM_CHAT_ID,
    tgSession,
    workerState: whatsappWorkers[0]?.state ?? await getWorkerState('whatsapp'),
    whatsappWorkers,
    telegramWorkerState: telegramWorkers[0]?.state ?? await getWorkerState('telegram'),
    telegramWorkers,
    canSpawnWorkers: canManagerSpawnWorkers(),
    mlCouponsUrl,
    saved,
    error,
  };
}

export async function saveChannelInviteLink(
  inviteLink: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(() => saveWhatsAppChannelInviteLink(inviteLink), 'Falha ao salvar link do canal');
}

export async function saveSendIntervalMinutes(
  minutes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(async () => {
    await saveCollectorIntervalMinutes(minutes);
    if (isRedisEnabled()) {
      await rescheduleCollectorJob();
    }
  }, 'Falha ao salvar intervalo de envio');
}

export async function saveSenderDelay(
  minutes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(() => saveSenderDelayMinutes(minutes), 'Falha ao salvar tempo de envio');
}

export async function saveOperatingHoursSettings(
  startRaw: string,
  endRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(async () => {
    const startHour = Number.parseInt(startRaw, 10);
    const endHour = Number.parseInt(endRaw, 10);
    await saveOperatingHours(startHour, endHour);
  }, 'Falha ao salvar janela operacional');
}

export async function saveBrandIdentity(input: {
  name: string;
  subtitle: string;
  logoData?: string;
  removeLogo?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(() => saveBrandSettings(input), 'Falha ao salvar identidade visual');
}

export async function saveCouponsUrlSettings(
  url: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(() => saveCouponsUrl(url), 'Falha ao salvar URL de cupons');
}

export async function saveScoreSettings(
  form: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return runSave(async () => {
    const config = parseScoreConfigFromForm(form);
    await saveScoreConfig(config);
  }, 'Falha ao salvar regras de score');
}

