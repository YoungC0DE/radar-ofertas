import {
  loadSettingsData,
  saveBrandIdentity,
  saveCouponsUrlSettings,
  saveAmazonAffiliateSettings,
  saveOperatingHoursSettings,
  saveScoreSettings,
  saveSendIntervalMinutes,
  saveSenderDelay,
} from '../models/settings-model.js';
import type { SettingsSaveType } from '../models/settings-model.js';
import { renderSettingsPage } from '../views/settings/index.js';

export async function showSettingsPage(
  saved: SettingsSaveType = null,
  error: string | null = null,
): Promise<string> {
  const data = await loadSettingsData(saved, error);
  return renderSettingsPage(data);
}

export async function handleSendIntervalSave(minutesRaw: string): Promise<string> {
  const minutes = Number.parseInt(minutesRaw, 10);
  const result = await saveSendIntervalMinutes(minutes);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('interval', null);
}

export async function handleBrandSave(form: Record<string, string>): Promise<string> {
  const result = await saveBrandIdentity({
    name: form.brandName ?? '',
    subtitle: form.brandSubtitle ?? '',
    logoData: form.logoData?.trim() || undefined,
    removeLogo: form.removeLogo === '1',
  });
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('brand', null);
}

export async function handleScoreSave(form: Record<string, string>): Promise<string> {
  const result = await saveScoreSettings(form);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('score', null);
}

export async function handleSenderDelaySave(minutesRaw: string): Promise<string> {
  const minutes = Number.parseInt(minutesRaw, 10);
  const result = await saveSenderDelay(minutes);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('senderDelay', null);
}

export async function handleCouponsUrlSave(url: string): Promise<string> {
  const result = await saveCouponsUrlSettings(url);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('couponsUrl', null);
}

export async function handleAmazonAffiliateSave(form: Record<string, string>): Promise<string> {
  const result = await saveAmazonAffiliateSettings({
    baseUrl: form.amazonBaseUrl ?? '',
    affiliateLinkPrefix: form.amazonAffiliateLinkPrefix ?? '',
    storeId: form.amazonAffiliateStoreId ?? '',
  });
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('amazonAffiliate', null);
}

export async function handleOperatingHoursSave(form: Record<string, string>): Promise<string> {
  const result = await saveOperatingHoursSettings(form.startHour ?? '', form.endHour ?? '');
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('hours', null);
}
