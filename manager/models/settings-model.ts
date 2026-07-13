import { getRuntimeQueueConfigAsync, saveCollectorIntervalMinutes, saveOperatingHours } from '../../src/config/queue-config-store.js';
import {
  describeScoreRules,
  getRuntimeScoreConfigAsync,
  parseScoreConfigFromForm,
  saveScoreConfig,
  type ScoreConfig,
} from '../../src/config/score-config.js';
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
  saveBrandSettings,
} from './brand-model.js';
import { isPlaceholderChannelId } from '../../src/whatsapp/index.js';

export type SettingsSaveType = 'channel' | 'interval' | 'brand' | 'score' | 'hours' | null;

export interface SettingsData {
  timezone: string;
  operatingHours: { start: number; end: number };
  operatingHoursLabel: string;
  withinOperatingHours: boolean;
  minScore: number;
  scoreConfig: ScoreConfig;
  scoreRulesSummary: string[];
  collectorIntervalMinutes: number;
  channelId: string;
  channelName: string | null;
  channelInviteLink: string;
  brandName: string;
  brandSubtitle: string;
  brandLogoHref: string | null;
  brandInitial: string;
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
  const queueConfig = await getRuntimeQueueConfigAsync();
  const scoreConfig = await getRuntimeScoreConfigAsync();
  const operatingHours = {
    start: queueConfig.operatingHoursStart,
    end: queueConfig.operatingHoursEnd,
  };

  const channelId = env.WHATSAPP_CHANNEL_ID;
  let channelName: string | null = null;
  let channelInviteLink = '';

  if (channelId && !isPlaceholderChannelId(channelId)) {
    channelName = await resolveWhatsAppChannelName(channelId);
    channelInviteLink = (await resolveWhatsAppChannelInviteLink(channelId)) ?? '';
  }

  const brand = getBrandSettings();

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
    collectorIntervalMinutes: queueConfig.collectorIntervalMinutes,
    channelId,
    channelName,
    channelInviteLink,
    brandName: brand.name,
    brandSubtitle: brand.subtitle,
    brandLogoHref: getBrandLogoHref(brand),
    brandInitial: getBrandInitial(brand.name),
    saved,
    error,
  };
}

export async function saveChannelInviteLink(
  inviteLink: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveWhatsAppChannelInviteLink(inviteLink);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar link do canal';
    return { ok: false, error: message };
  }
}

export async function saveSendIntervalMinutes(
  minutes: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveCollectorIntervalMinutes(minutes);
    if (isRedisEnabled()) {
      await rescheduleCollectorJob();
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar intervalo de envio';
    return { ok: false, error: message };
  }
}

export async function saveOperatingHoursSettings(
  startRaw: string,
  endRaw: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const startHour = Number.parseInt(startRaw, 10);
    const endHour = Number.parseInt(endRaw, 10);
    await saveOperatingHours(startHour, endHour);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar janela operacional';
    return { ok: false, error: message };
  }
}

export async function saveBrandIdentity(input: {
  name: string;
  subtitle: string;
  logoData?: string;
  removeLogo?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveBrandSettings(input);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar identidade visual';
    return { ok: false, error: message };
  }
}

export async function saveScoreSettings(
  form: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const config = parseScoreConfigFromForm(form);
    await saveScoreConfig(config);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar regras de score';
    return { ok: false, error: message };
  }
}
