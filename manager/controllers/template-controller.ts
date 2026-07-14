import { loadTemplatePage, saveTemplateFromForm } from '../models/template-model.js';
import { renderTemplatePage } from '../views/template.js';

export async function showTemplatePage(saved = false, error: string | null = null): Promise<string> {
  const data = await loadTemplatePage(saved, error);
  return renderTemplatePage(data);
}

export async function handleTemplateSave(form: Record<string, string>): Promise<string> {
  const result = await saveTemplateFromForm(form.template ?? '', form);
  if (!result.ok) {
    return showTemplatePage(false, result.error);
  }
  return showTemplatePage(true, null);
}
