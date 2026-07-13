import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env.js';

export interface WhatsAppChannelCache {
  channelId: string;
  channelName: string;
  inviteLink: string | null;
  updatedAt: string;
}

function cachePath(): string {
  return path.resolve('./data/whatsapp-channel.json');
}

export function normalizeInviteLink(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return '';

  const fromUrl = trimmed.match(/channel\/([A-Za-z0-9]+)/)?.[1];
  if (fromUrl) {
    return trimmed.startsWith('http')
      ? trimmed
      : `https://whatsapp.com/channel/${fromUrl}`;
  }

  return `https://whatsapp.com/channel/${trimmed}`;
}

export async function saveWhatsAppChannelCache(
  channelId: string,
  channelName: string,
  inviteLink?: string | null,
): Promise<void> {
  const existing = await loadWhatsAppChannelCache();
  const filePath = cachePath();
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  const payload: WhatsAppChannelCache = {
    channelId,
    channelName,
    inviteLink:
      inviteLink !== undefined
        ? inviteLink?.trim() || null
        : existing?.inviteLink ?? null,
    updatedAt: new Date().toISOString(),
  };

  await fs.writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

export async function saveWhatsAppChannelInviteLink(inviteLink: string): Promise<void> {
  const normalized = normalizeInviteLink(inviteLink);
  if (!normalized) {
    throw new Error('Informe um link de compartilhamento válido');
  }

  const existing = await loadWhatsAppChannelCache();
  if (existing) {
    await saveWhatsAppChannelCache(existing.channelId, existing.channelName, normalized);
    return;
  }

  const channelId = env.WHATSAPP_CHANNEL_ID.trim();
  if (!channelId) {
    throw new Error('Canal ainda não configurado — defina WHATSAPP_CHANNEL_ID no .env');
  }

  await saveWhatsAppChannelCache(channelId, 'Canal WhatsApp', normalized);
}

export async function loadWhatsAppChannelCache(): Promise<WhatsAppChannelCache | null> {
  try {
    const raw = await fs.readFile(cachePath(), 'utf8');
    const parsed = JSON.parse(raw) as WhatsAppChannelCache;
    if (!parsed.channelId || !parsed.channelName) return null;
    return {
      channelId: parsed.channelId,
      channelName: parsed.channelName,
      inviteLink: parsed.inviteLink ?? null,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

export async function resolveWhatsAppChannelName(channelId: string): Promise<string | null> {
  if (!channelId) return null;

  const cache = await loadWhatsAppChannelCache();
  if (cache?.channelId === channelId && cache.channelName) {
    return cache.channelName;
  }

  return null;
}

export async function resolveWhatsAppChannelInviteLink(channelId: string): Promise<string | null> {
  if (!channelId) return null;

  const cache = await loadWhatsAppChannelCache();
  if (cache?.channelId === channelId && cache.inviteLink) {
    return cache.inviteLink;
  }

  return null;
}
