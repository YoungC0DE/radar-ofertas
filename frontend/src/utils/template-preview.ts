export function cleanupRenderedMessage(text: string): string {
  return text
    .split('\n')
    .filter((line) => /[A-Za-z0-9À-ÿ$]/.test(line))
    .join('\n')
    .trim();
}

export function renderTemplatePreview(
  template: string,
  previewValues: Record<string, string>,
  visibility: Record<string, boolean>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(previewValues)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(pattern, visibility[key] ? value : '');
  }
  const cleaned = cleanupRenderedMessage(result);
  return cleaned || '(vazio)';
}

export function insertPlaceholder(
  template: string,
  token: string,
  selectionStart: number,
  selectionEnd: number,
): { next: string; cursor: number } {
  const next = template.slice(0, selectionStart) + token + template.slice(selectionEnd);
  return { next, cursor: selectionStart + token.length };
}
