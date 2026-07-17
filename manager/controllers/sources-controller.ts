import { isChannel, type Channel } from '../../src/channels/types.js';
import {
  addSource,
  loadSourcesData,
  removeSource,
  saveSourceFlags,
  type SourcesSaveType,
} from '../models/sources-model.js';
import { renderSourcesPage } from '../views/sources.js';

/** Canal da URL; default WhatsApp quando ausente ou inválido. */
export function parseSourcesChannel(value: string | undefined): Channel {
  return value && isChannel(value) ? value : 'whatsapp';
}

async function page(channel: Channel, saved: SourcesSaveType, error: string | null): Promise<string> {
  const data = await loadSourcesData(channel, saved, error);
  return renderSourcesPage(data);
}

export async function showSourcesPage(channel: Channel): Promise<string> {
  return page(channel, null, null);
}

export async function handleSourceFlagsSave(
  channel: Channel,
  form: Record<string, string>,
): Promise<string> {
  const result = await saveSourceFlags(channel, form);
  return page(channel, result.ok ? 'flags' : null, result.ok ? null : result.error);
}

export async function handleSourceAdd(
  channel: Channel,
  form: Record<string, string>,
): Promise<string> {
  const result = await addSource(channel, form.url ?? '', form.label);
  return page(channel, result.ok ? 'added' : null, result.ok ? null : result.error);
}

export async function handleSourceRemove(channel: Channel, id: string): Promise<string> {
  const result = await removeSource(id);
  return page(channel, result.ok ? 'removed' : null, result.ok ? null : result.error);
}
