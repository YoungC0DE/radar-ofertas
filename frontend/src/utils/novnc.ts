/** Monta a URL do noVNC usando o hostname atual do painel. */
export function buildNovncUrl(port: number | null | undefined): string | null {
  if (port == null || port <= 0) return null;
  if (typeof window === 'undefined') return null;
  return `http://${window.location.hostname}:${port}/vnc_lite.html?scale=true&path=websockify`;
}

/** Abre o desktop do container (login ML). Deve ser chamado no clique do usuário. */
export function openNovncTab(port: number | null | undefined): void {
  const url = buildNovncUrl(port);
  if (!url) return;
  window.open(url, '_blank', 'noopener');
}
