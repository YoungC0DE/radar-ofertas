/**
 * Hot reload do painel é independente de NODE_ENV — necessário no Docker com volumes
 * montados (NODE_ENV=production, mas código vem do host).
 *
 * - MANAGER_HOT_RELOAD=true  → força ativo (ex.: container manager)
 * - MANAGER_HOT_RELOAD=false → força inativo
 * - omitido                  → ativo quando NODE_ENV !== 'production'
 */
export function isManagerHotReloadEnabled(): boolean {
  const explicit = process.env.MANAGER_HOT_RELOAD;
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;
  return process.env.NODE_ENV !== 'production';
}

export function shouldCacheManagerStaticAssets(): boolean {
  return !isManagerHotReloadEnabled();
}
