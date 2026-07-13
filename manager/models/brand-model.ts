import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export interface BrandSettings {
  name: string;
  subtitle: string;
  logoBase64: string | null;
}

const DEFAULT_BRAND: BrandSettings = {
  name: 'Radar Ofertas',
  subtitle: 'Painel de controle',
  logoBase64: null,
};

function brandConfigPath(): string {
  return path.resolve('./data/brand.json');
}

function parseDataUrl(dataUrl: string): string | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  return `data:${match[1]};base64,${match[2]}`;
}

function mimeFromExt(ext: string): string {
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'image/png';
}

function migrateLegacyLogo(parsed: Record<string, unknown>): string | null {
  if (typeof parsed.logoBase64 === 'string' && parsed.logoBase64.trim()) {
    return parseDataUrl(parsed.logoBase64.trim()) ?? parsed.logoBase64.trim();
  }

  const legacyPath = typeof parsed.logoPath === 'string' ? parsed.logoPath : null;
  if (!legacyPath) return null;

  try {
    const buffer = readFileSync(path.resolve(legacyPath));
    const mime = mimeFromExt(path.extname(legacyPath).toLowerCase());
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch {
    return null;
  }
}

export function getBrandSettings(): BrandSettings {
  try {
    const raw = readFileSync(brandConfigPath(), 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : DEFAULT_BRAND.name,
      subtitle:
        typeof parsed.subtitle === 'string' && parsed.subtitle.trim()
          ? parsed.subtitle.trim()
          : DEFAULT_BRAND.subtitle,
      logoBase64: migrateLegacyLogo(parsed),
    };
  } catch {
    return { ...DEFAULT_BRAND };
  }
}

export function getBrandLogoHref(brand: BrandSettings = getBrandSettings()): string | null {
  return brand.logoBase64;
}

export function getBrandInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : 'R';
}

async function writeBrandConfig(settings: BrandSettings): Promise<void> {
  await fs.mkdir(path.dirname(brandConfigPath()), { recursive: true });
  await fs.writeFile(brandConfigPath(), `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
}

export async function saveBrandSettings(input: {
  name: string;
  subtitle: string;
  logoData?: string;
  removeLogo?: boolean;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error('Informe o nome do painel');

  const subtitle = input.subtitle.trim() || DEFAULT_BRAND.subtitle;
  const current = getBrandSettings();

  let logoBase64: string | null = current.logoBase64;

  if (input.removeLogo) {
    logoBase64 = null;
  }

  const logoData = input.logoData?.trim();
  if (logoData) {
    const normalized = parseDataUrl(logoData);
    if (!normalized) throw new Error('Imagem inválida — envie PNG, JPG ou WEBP');
    logoBase64 = normalized;
  }

  await writeBrandConfig({ name, subtitle, logoBase64 });
}
