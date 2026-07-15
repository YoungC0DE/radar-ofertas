import { loadSettingsData, saveBrandIdentity, saveChannelInviteLink, saveMlSourcesFlags, addMlSource, deleteMlSource, saveOperatingHoursSettings, saveScoreSettings, saveSendIntervalMinutes, saveSenderDelay } from '../models/settings-model.js';
import type { SettingsSaveType } from '../models/settings-model.js';
import { renderSettingsPage } from '../views/settings.js';

export async function showSettingsPage(
  saved: SettingsSaveType = null,
  error: string | null = null,
): Promise<string> {
  const data = await loadSettingsData(saved, error);
  return renderSettingsPage(data);
}

export async function handleChannelLinkSave(inviteLink: string): Promise<string> {
  const result = await saveChannelInviteLink(inviteLink);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('channel', null);
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

export async function handleOperatingHoursSave(form: Record<string, string>): Promise<string> {
  const result = await saveOperatingHoursSettings(form.startHour ?? '', form.endHour ?? '');
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('hours', null);
}

export async function handleMlSourcesSave(form: Record<string, string>): Promise<string> {
  const result = await saveMlSourcesFlags(form);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('mlSources', null);
}

export async function handleMlSourceAdd(form: Record<string, string>): Promise<string> {
  const result = await addMlSource(form.url ?? '', form.label);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('mlSources', null);
}

export async function handleMlSourceRemove(id: string): Promise<string> {
  const result = await deleteMlSource(id);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('mlSources', null);
}
