import { randomUUID } from 'node:crypto';

import { env } from './env.js';
import { prisma } from '../database/client.js';
import {
  validateCategoryConfig,
  type CategoryListingKind,
  type CategoryValidation,
} from '../mercado-livre/category-url.js';

export interface MlCustomSource {
  id: string;
  label: string;
  url: string;
  enabled: boolean;
}

export interface MlCategoryRow {
  id: string;
  label: string;
  category: string;
  enabled: boolean;
  fromEnv: boolean;
  valid: boolean;
  type: CategoryValidation['type'];
  listingKind: CategoryListingKind;
  reason?: string;
}

const SETTING_KEY = 'mlCustomSources';
const ENV_FLAGS_KEY = 'mlEnvSourceFlags';
let sourcesCache: MlCustomSource[] | null = null;
let envFlagsCache: Record<string, boolean> | null = null;

function parseEnvFlagsFromJson(raw: string): Record<string, boolean> {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const flags: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      flags[key] = value !== false;
    }
    return flags;
  } catch {
    return {};
  }
}

/** Uma categoria do .env está ativa por padrão; só fica inativa se salva como false. */
function isEnvCategoryEnabled(category: string): boolean {
  return (envFlagsCache ?? {})[category] !== false;
}

function parseSourcesFromJson(raw: string): MlCustomSource[] {
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];

  const sources: MlCustomSource[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!url) continue;

    sources.push({
      id: typeof row.id === 'string' && row.id.trim() ? row.id.trim() : randomUUID(),
      label: typeof row.label === 'string' && row.label.trim() ? row.label.trim() : deriveLabel(url),
      url,
      enabled: row.enabled !== false,
    });
  }

  return sources;
}

function deriveLabel(category: string): string {
  const validation = validateCategoryConfig(category);
  if (validation.listingKind === 'offers') {
    try {
      const parsed = new URL(category);
      const containerId = parsed.searchParams.get('container_id');
      if (containerId) return `Ofertas ${containerId}`;
      const dealIds = parsed.searchParams.get('deal_ids');
      if (dealIds) return `Ofertas ${dealIds}`;
      return 'Ofertas ML';
    } catch {
      return 'Ofertas ML';
    }
  }

  return category;
}

function normalizeCategoryKey(category: string): string {
  const validation = validateCategoryConfig(category);
  return validation.valid && validation.url ? validation.url : category.trim();
}

export function getCustomMlSources(): MlCustomSource[] {
  return sourcesCache ?? [];
}

export function getEnvMlCategories(): string[] {
  return env.ML_CATEGORIES;
}

export function getActiveMlCategories(): string[] {
  const envActive = env.ML_CATEGORIES.filter((category) => isEnvCategoryEnabled(category));
  const custom = getCustomMlSources()
    .filter((source) => source.enabled)
    .map((source) => source.url.trim());
  return [...envActive, ...custom];
}

export function buildMlCategoryRows(): MlCategoryRow[] {
  const envRows: MlCategoryRow[] = env.ML_CATEGORIES.map((category, index) => {
    const validation = validateCategoryConfig(category);
    return {
      id: `env:${index}`,
      label: category,
      category,
      enabled: isEnvCategoryEnabled(category),
      fromEnv: true,
      valid: validation.valid,
      type: validation.type,
      listingKind: validation.listingKind,
      reason: validation.reason,
    };
  });

  const customRows: MlCategoryRow[] = getCustomMlSources().map((source) => {
    const validation = validateCategoryConfig(source.url);
    return {
      id: source.id,
      label: source.label,
      category: source.url,
      enabled: source.enabled,
      fromEnv: false,
      valid: validation.valid,
      type: validation.type,
      listingKind: validation.listingKind,
      reason: validation.reason,
    };
  });

  return [...envRows, ...customRows];
}

export async function hydrateMlSourcesCache(): Promise<void> {
  try {
    const [sourcesRow, flagsRow] = await Promise.all([
      prisma.setting.findUnique({ where: { key: SETTING_KEY } }),
      prisma.setting.findUnique({ where: { key: ENV_FLAGS_KEY } }),
    ]);
    sourcesCache = sourcesRow ? parseSourcesFromJson(sourcesRow.value) : [];
    envFlagsCache = flagsRow ? parseEnvFlagsFromJson(flagsRow.value) : {};
  } catch {
    sourcesCache = [];
    envFlagsCache = {};
  }
}

async function persistCustomSources(sources: MlCustomSource[]): Promise<void> {
  const json = JSON.stringify(sources);
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: json },
    create: { key: SETTING_KEY, value: json },
  });
  sourcesCache = sources;
}

async function persistEnvFlags(flags: Record<string, boolean>): Promise<void> {
  const json = JSON.stringify(flags);
  await prisma.setting.upsert({
    where: { key: ENV_FLAGS_KEY },
    update: { value: json },
    create: { key: ENV_FLAGS_KEY, value: json },
  });
  envFlagsCache = flags;
}

export async function addCustomMlSource(
  url: string,
  label?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = url.trim();
  if (!trimmed) {
    return { ok: false, error: 'Informe um link ou ID de categoria' };
  }

  const validation = validateCategoryConfig(trimmed);
  if (!validation.valid) {
    return { ok: false, error: validation.reason ?? 'Link ou categoria inválida' };
  }

  const normalized = validation.url || trimmed;
  const key = normalizeCategoryKey(normalized);
  const envKeys = new Set(env.ML_CATEGORIES.map((category) => normalizeCategoryKey(category)));
  if (envKeys.has(key)) {
    return { ok: false, error: 'Este link já está configurado no .env (ML_CATEGORIES)' };
  }

  const sources = [...getCustomMlSources()];
  if (sources.some((source) => normalizeCategoryKey(source.url) === key)) {
    return { ok: false, error: 'Este link já está cadastrado' };
  }

  sources.push({
    id: randomUUID(),
    label: label?.trim() || deriveLabel(trimmed),
    url: normalized,
    enabled: true,
  });

  await persistCustomSources(sources);
  return { ok: true };
}

export async function removeCustomMlSource(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const sources = getCustomMlSources();
  const next = sources.filter((source) => source.id !== id);
  if (next.length === sources.length) {
    return { ok: false, error: 'Link não encontrado' };
  }

  await persistCustomSources(next);
  return { ok: true };
}

export async function saveMlSourceFlagsFromForm(
  form: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sources = getCustomMlSources().map((source) => ({
    ...source,
    enabled: form[`enabled_${source.id}`] === '1',
  }));

  const envFlags: Record<string, boolean> = {};
  env.ML_CATEGORIES.forEach((category, index) => {
    envFlags[category] = form[`enabled_env:${index}`] === '1';
  });

  await Promise.all([persistCustomSources(sources), persistEnvFlags(envFlags)]);
  return { ok: true };
}

/** Apenas para testes unitários. */
export function setMlSourcesCacheForTest(sources: MlCustomSource[] | null): void {
  sourcesCache = sources;
}

/** Apenas para testes unitários. */
export function setEnvFlagsCacheForTest(flags: Record<string, boolean> | null): void {
  envFlagsCache = flags;
}
