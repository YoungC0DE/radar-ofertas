import {
  createAutoMessageFromForm,
  deleteAutoMessageById,
  loadTemplatePage,
  saveTemplateFromForm,
  sendAutoMessageNow,
  updateAutoMessageFromForm,
} from '../models/template-model.js';
import { renderTemplatePage } from '../views/template.js';

export async function showTemplatePage(
  saved = false,
  error: string | null = null,
  autoMessageNotice: string | null = null,
): Promise<string> {
  const data = await loadTemplatePage(saved, error, autoMessageNotice);
  return renderTemplatePage(data);
}

export async function handleTemplateSave(form: Record<string, string>): Promise<string> {
  const result = await saveTemplateFromForm(form.template ?? '', form);
  if (!result.ok) {
    return showTemplatePage(false, result.error);
  }
  return showTemplatePage(true, null);
}

export async function handleAutoMessageCreate(form: Record<string, string>): Promise<string> {
  const result = await createAutoMessageFromForm(form);
  if (!result.ok) {
    return showTemplatePage(false, result.error);
  }
  return showTemplatePage(false, null, result.summary);
}

export async function handleAutoMessageUpdate(id: string, form: Record<string, string>): Promise<string> {
  const result = await updateAutoMessageFromForm(id, form);
  if (!result.ok) {
    return showTemplatePage(false, result.error);
  }
  return showTemplatePage(false, null, result.summary);
}

export async function handleAutoMessageDelete(id: string): Promise<string> {
  const result = await deleteAutoMessageById(id);
  if (!result.ok) {
    return showTemplatePage(false, result.error);
  }
  return showTemplatePage(false, null, 'Mensagem excluída.');
}

export async function handleAutoMessageSendNow(id: string): Promise<string> {
  const result = await sendAutoMessageNow(id);
  if (!result.ok) {
    return showTemplatePage(false, result.error);
  }
  return showTemplatePage(false, null, 'Envio enfileirado — deve publicar em instantes.');
}
