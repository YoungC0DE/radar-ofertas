import { getEnabledChannels } from '../../src/channels/index.js';
import { CHANNEL_LABELS, type Channel } from '../../src/channels/types.js';
import {
  addCustomMlSource,
  buildMlCategoryRows,
  hydrateMlSourcesCache,
  removeCustomMlSource,
  saveMlSourceChannelsFromForm,
  type MlCategoryRow,
} from '../../src/config/ml-sources-config.js';

export type SourcesSaveType = 'flags' | 'added' | 'removed' | null;

export interface SourcesPageData {
  channel: Channel;
  channelLabel: string;
  /** Abas do topo — um link por canal ligado. */
  channels: { channel: Channel; label: string; active: boolean }[];
  rows: MlCategoryRow[];
  activeCount: number;
  saved: SourcesSaveType;
  error: string | null;
}

export async function loadSourcesData(
  channel: Channel,
  saved: SourcesSaveType = null,
  error: string | null = null,
): Promise<SourcesPageData> {
  await hydrateMlSourcesCache();
  const rows = buildMlCategoryRows();

  return {
    channel,
    channelLabel: CHANNEL_LABELS[channel],
    channels: getEnabledChannels().map((ch) => ({
      channel: ch,
      label: CHANNEL_LABELS[ch],
      active: ch === channel,
    })),
    rows,
    activeCount: rows.filter((row) => row.channels.includes(channel)).length,
    saved,
    error,
  };
}

export async function saveSourceFlags(
  channel: Channel,
  form: Record<string, string>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return saveMlSourceChannelsFromForm(channel, form);
}

/** Novo link entra ativo apenas no canal da página onde foi adicionado. */
export async function addSource(
  channel: Channel,
  url: string,
  label?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return addCustomMlSource(url, label, [channel]);
}

export async function removeSource(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return removeCustomMlSource(id);
}
