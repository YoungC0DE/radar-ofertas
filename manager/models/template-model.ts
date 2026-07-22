import { findOffers } from '../../src/offers/repository.js';
import {
  AUTO_MESSAGE_PLACEHOLDERS,
  describeAutoMessageSchedule,
  dispatchAutoMessage,
  listAutoMessages,
  removeAutoMessage,
  renderAutoMessageContent,
  saveAutoMessageFromForm,
} from '../../src/auto-messages/service.js';
import type { AutoMessageRecord } from '../../src/auto-messages/types.js';
import { formatTimeInputValue, toDatetimeLocalInputValue } from '../../src/utils/datetime.js';
import {
  buildTemplateValues,
  DEFAULT_MESSAGE_TEMPLATE,
  DEFAULT_PLACEHOLDER_VISIBILITY,
  loadMessageTemplate,
  loadPlaceholderVisibility,
  MESSAGE_PLACEHOLDERS,
  type PlaceholderVisibility,
  parsePlaceholderVisibilityFromForm,
  renderMessageTemplate,
  sampleTemplateValues,
  saveMessageTemplate,
  savePlaceholderVisibility,
} from '../../src/offers/message-template.js';
import type { OfferRecord } from '../../src/offers/types.js';
import { withDatabase, type DatabaseSnapshot } from './db-model.js';

export interface TemplatePageData {
  database: DatabaseSnapshot;
  template: string;
  defaultTemplate: string;
  previewOffer: OfferRecord | null;
  previewText: string;
  previewValues: ReturnType<typeof buildTemplateValues>;
  placeholderVisibility: PlaceholderVisibility;
  autoMessages: AutoMessageRecord[];
  autoMessagePlaceholders: typeof AUTO_MESSAGE_PLACEHOLDERS;
  saved: boolean;
  autoMessageNotice: string | null;
  error: string | null;
}

export async function loadTemplatePage(
  saved = false,
  error: string | null = null,
  autoMessageNotice: string | null = null,
): Promise<TemplatePageData> {
  const [template, placeholderVisibility, autoMessages] = await Promise.all([
    loadMessageTemplate(),
    loadPlaceholderVisibility(),
    listAutoMessages(),
  ]);
  const samplePreviewText = renderMessageTemplate(template, sampleTemplateValues(), placeholderVisibility);

  const offerResult = await withDatabase(
    async () => {
      const offers = await findOffers({ limit: 1 });
      return offers[0] ?? null;
    },
    null,
  );

  const previewOffer = offerResult.data;
  const previewValues = previewOffer ? buildTemplateValues(previewOffer) : sampleTemplateValues();
  const previewText = renderMessageTemplate(template, previewValues, placeholderVisibility);

  return {
    database: offerResult.database,
    template,
    defaultTemplate: DEFAULT_MESSAGE_TEMPLATE,
    previewOffer,
    previewText,
    previewValues,
    placeholderVisibility,
    autoMessages,
    autoMessagePlaceholders: AUTO_MESSAGE_PLACEHOLDERS,
    saved,
    autoMessageNotice,
    error,
  };
}

export async function saveTemplateFromForm(
  template: string,
  form: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await saveMessageTemplate(template);
    await savePlaceholderVisibility(parsePlaceholderVisibilityFromForm(form));
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar template';
    return { ok: false, error: message };
  }
}

export function getPlaceholderHelp() {
  return MESSAGE_PLACEHOLDERS;
}

export function getPreviewForOffer(
  template: string,
  offer: OfferRecord,
  visibility: PlaceholderVisibility = DEFAULT_PLACEHOLDER_VISIBILITY,
): string {
  return renderMessageTemplate(template, buildTemplateValues(offer), visibility);
}

export function getPreviewValues(offer: OfferRecord) {
  return buildTemplateValues(offer);
}

export async function createAutoMessageFromForm(
  form: Record<string, string>,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const result = await saveAutoMessageFromForm(form);
  return result.ok ? { ok: true, summary: result.summary } : { ok: false, error: result.error };
}

export async function updateAutoMessageFromForm(
  id: string,
  form: Record<string, string>,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> {
  const result = await saveAutoMessageFromForm(form, id);
  return result.ok ? { ok: true, summary: result.summary } : { ok: false, error: result.error };
}

export async function deleteAutoMessageById(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return removeAutoMessage(id);
}

export async function sendAutoMessageNow(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return dispatchAutoMessage(id, { force: true });
}

export function getAutoMessagePreview(content: string): string {
  return renderAutoMessageContent(content);
}

export function getAutoMessageScheduleLabel(message: AutoMessageRecord): string {
  return describeAutoMessageSchedule(message);
}

export function getAutoMessageScheduledInputValue(message: AutoMessageRecord): string {
  return message.scheduledAt ? toDatetimeLocalInputValue(message.scheduledAt) : '';
}

export function getAutoMessageDailyTimeValue(message: AutoMessageRecord): string {
  if (message.dailyHour === null) return '08:00';
  return formatTimeInputValue(message.dailyHour, message.dailyMinute ?? 0);
}
