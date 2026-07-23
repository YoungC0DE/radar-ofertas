export function pageStyles(...files: string[]): string {
  return files
    .map((file) => `<link rel="stylesheet" href="/manager/assets/css/${file}">`)
    .join('\n');
}

export function pageScripts(...files: string[]): string {
  const cacheBust =
    process.env.NODE_ENV !== 'production' ? `?v=${Date.now().toString(36)}` : '';
  return files
    .map((file) => `<script src="/manager/assets/js/${file}${cacheBust}" defer></script>`)
    .join('\n');
}

export function pageData(id: string, data: unknown): string {
  return `<script type="application/json" id="${id}">${JSON.stringify(data)}</script>`;
}

export const LAYOUT_SCRIPTS = pageScripts('shared/confirm.js');
