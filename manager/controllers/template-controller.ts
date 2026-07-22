import {
  createAutoMessageFromForm,
  deleteAutoMessageById,
  loadTemplatePage,
  saveCouponTemplateFromForm,
  saveTemplateFromForm,
  sendAutoMessageNow,
  updateAutoMessageFromForm,
  type TemplateSavedSection,
} from '../models/template-model.js';
import { renderTemplatePage } from '../views/template.js';

export async function showTemplatePage(
  savedSection: TemplateSavedSection = null,
  error: string | null = null,
  autoMessageNotice: string | null = null,
): Promise<string> {
  const data = await loadTemplatePage(savedSection, error, autoMessageNotice);
  return renderTemplatePage(data);
}

export async function handleTemplateSave(form: Record<string, string>): Promise<string> {
  const result = await saveTemplateFromForm(form.template ?? '', form);
  if (!result.ok) {
    return showTemplatePage(null, result.error);
  }
  return showTemplatePage('offer', null);
}

export async function handleCouponTemplateSave(form: Record<string, string>): Promise<string> {
  const result = await saveCouponTemplateFromForm(form.couponTemplate ?? '', form);
  if (!result.ok) {
    return showTemplatePage(null, result.error);
  }
  return showTemplatePage('coupon', null);
}

export async function handleAutoMessageCreate(form: Record<string, string>): Promise<string> {
  const result = await createAutoMessageFromForm(form);
  if (!result.ok) {
    return showTemplatePage(null, result.error);
  }
    return showTemplatePage(null, null, result.summary);
}

export async function handleAutoMessageUpdate(id: string, form: Record<string, string>): Promise<string> {
  const result = await updateAutoMessageFromForm(id, form);
  if (!result.ok) {
    return showTemplatePage(null, result.error);
  }
    return showTemplatePage(null, null, result.summary);
}

export async function handleAutoMessageDelete(id: string): Promise<string> {
  const result = await deleteAutoMessageById(id);
  if (!result.ok) {
    return showTemplatePage(null, result.error);
  }
  return showTemplatePage(null, null, 'Mensagem excluída.');
}

export async function handleAutoMessageSendNow(id: string): Promise<string> {
  const result = await sendAutoMessageNow(id);
  if (!result.ok) {
    return showTemplatePage(null, result.error);
  }
  return showTemplatePage(null, null, 'Envio enfileirado — deve publicar em instantes.');
}
