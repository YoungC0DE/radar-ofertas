import {
  loadSettingsData,
  saveBrandIdentity,
  saveChannelInviteLink,
  saveCouponsUrlSettings,
  saveOperatingHoursSettings,
  saveScoreSettings,
  saveSendIntervalMinutes,
  saveSenderDelay,
} from '../models/settings-model.js';
import {
  addWhatsAppDestination,
  removeWhatsAppDestinationById,
  setWhatsAppDestinationEnabled,
} from '../models/whatsapp-destinations-model.js';
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

export async function handleWhatsAppDestinationAdd(inviteInput: string): Promise<string> {
  const result = await addWhatsAppDestination(inviteInput);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('channel', null);
}

export async function handleWhatsAppDestinationRemove(destinationId: string): Promise<string> {
  const result = await removeWhatsAppDestinationById(destinationId);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('channel', null);
}

export async function handleWhatsAppDestinationToggle(
  destinationId: string,
  enabled: boolean,
): Promise<string> {
  const result = await setWhatsAppDestinationEnabled(destinationId, enabled);
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

export async function handleCouponsUrlSave(url: string): Promise<string> {
  const result = await saveCouponsUrlSettings(url);
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('couponsUrl', null);
}

export async function handleOperatingHoursSave(form: Record<string, string>): Promise<string> {
  const result = await saveOperatingHoursSettings(form.startHour ?? '', form.endHour ?? '');
  if (!result.ok) {
    return showSettingsPage(null, result.error);
  }
  return showSettingsPage('hours', null);
}
