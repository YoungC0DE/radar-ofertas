import { findOffers } from '../../src/offers/repository.js';
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
  saved: boolean;
  error: string | null;
}

export async function loadTemplatePage(saved = false, error: string | null = null): Promise<TemplatePageData> {
  const [template, placeholderVisibility] = await Promise.all([
    loadMessageTemplate(),
    loadPlaceholderVisibility(),
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
    saved,
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
