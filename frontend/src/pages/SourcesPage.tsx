import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { api } from '../services/api.js';
import type {
  AmazonSourceRow,
  MlSourceRow,
  PatchSourcesBody,
  SourceChannel,
  SourcesResponse,
} from '../types/api.js';
import { ApiError } from '../types/api.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { useConfirm } from '../components/feedback/ConfirmProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
import { Checkbox } from '../components/ui/Checkbox.js';
import { Input } from '../components/ui/Input.js';
import { Page } from '../components/ui/Layout.js';
import { Modal, ModalActions } from '../components/ui/Modal.js';
import { Spinner } from '../components/ui/Spinner.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table.js';
import { cn } from '../lib/cn.js';
import { listingKindLabel, parseEnvSourceIndex } from '../constants/sources.js';

type SourceFlags = Record<string, boolean>;

function isSourceChannel(value: string | undefined): value is SourceChannel {
  return value === 'whatsapp' || value === 'telegram';
}

function buildInitialFlags(data: SourcesResponse, channel: SourceChannel): SourceFlags {
  const flags: SourceFlags = {};
  for (const row of [...data.mlRows, ...data.amazonRows]) {
    flags[row.id] = row.channels.includes(channel);
  }
  return flags;
}

function buildPatchBody(data: SourcesResponse, flags: SourceFlags): PatchSourcesBody {
  const mlEnv = data.mlRows
    .filter((row) => row.fromEnv)
    .map((row) => {
      const index = parseEnvSourceIndex(row.id);
      return index == null ? null : { index, enabled: flags[row.id] ?? false };
    })
    .filter((item): item is { index: number; enabled: boolean } => item != null);

  const mlCustom = data.mlRows
    .filter((row) => !row.fromEnv)
    .map((row) => ({ id: row.id, enabled: flags[row.id] ?? false }));

  const amazonEnv = data.amazonRows
    .filter((row) => row.fromEnv)
    .map((row) => {
      const index = parseEnvSourceIndex(row.id);
      return index == null ? null : { index, enabled: flags[row.id] ?? false };
    })
    .filter((item): item is { index: number; enabled: boolean } => item != null);

  const amazonCustom = data.amazonRows
    .filter((row) => !row.fromEnv)
    .map((row) => ({ id: row.id, enabled: flags[row.id] ?? false }));

  return { ml: { env: mlEnv, custom: mlCustom }, amazon: { env: amazonEnv, custom: amazonCustom } };
}

function otherChannelsHint(channels: SourceChannel[], channel: SourceChannel): string | null {
  const others = channels.filter((item) => item !== channel);
  if (others.length === 0) return null;
  return `Também: ${others.join(', ')}`;
}

type SourceRowProps = {
  row: MlSourceRow | AmazonSourceRow;
  channel: SourceChannel;
  checked: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onRemove?: () => void;
  url: string;
  kind: string;
};

function SourceRow({ row, channel, checked, onToggle, onRemove, url, kind }: SourceRowProps) {
  const others = otherChannelsHint(row.channels, channel);
  const statusTone = !row.valid ? 'warning' : checked ? 'success' : 'neutral';
  const statusLabel = !row.valid ? 'Inválida' : checked ? 'Coletando' : 'Fora';

  return (
    <TableRow>
      <TableCell>
        <Checkbox
          label="Coletar"
          checked={checked}
          onChange={(event) => onToggle(row.id, event.target.checked)}
        />
      </TableCell>
      <TableCell>
        <div className="font-medium text-text-primary">{row.label}</div>
        <div className="truncate text-sm text-text-secondary" title={url}>
          {url}
        </div>
        {others ? <div className="text-sm text-text-secondary">{others}</div> : null}
      </TableCell>
      <TableCell>
        <Badge tone="neutral">{row.fromEnv ? '.env' : 'Extra'}</Badge>
      </TableCell>
      <TableCell>
        <Badge tone="neutral">{listingKindLabel(kind)}</Badge>
      </TableCell>
      <TableCell>
        <Badge tone={statusTone}>{statusLabel}</Badge>
      </TableCell>
      <TableCell>{row.reason ?? listingKindLabel(kind)}</TableCell>
      <TableCell>
        {onRemove ? (
          <Button variant="danger" onClick={onRemove}>
            Remover
          </Button>
        ) : null}
      </TableCell>
    </TableRow>
  );
}

type AddSourceModalProps = {
  open: boolean;
  title: string;
  help: string;
  urlPlaceholder: string;
  onClose: () => void;
  onSubmit: (body: { url: string; label: string }) => Promise<void>;
};

function AddSourceModal({
  open,
  title,
  help,
  urlPlaceholder,
  onClose,
  onSubmit,
}: AddSourceModalProps) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLabel('');
    setUrl('');
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSubmit({ url: url.trim(), label: label.trim() });
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      wide
      footer={
        <ModalActions
          onCancel={onClose}
          onConfirm={() => void handleSubmit({ preventDefault: () => undefined } as FormEvent)}
          loading={loading}
          confirmLabel="Adicionar"
        />
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(event) => void handleSubmit(event)}>
        <Input label="Nome (opcional)" value={label} onChange={(event) => setLabel(event.target.value)} />
        <Input
          label="Link"
          value={url}
          required
          placeholder={urlPlaceholder}
          onChange={(event) => setUrl(event.target.value)}
        />
        <p className="text-xs text-text-secondary">{help}</p>
      </form>
    </Modal>
  );
}

function PlatformSourcesTable({
  title,
  envRows,
  customRows,
  channel,
  flags,
  platform,
  onToggle,
  onRemove,
  getUrl,
  getKind,
}: {
  title: string;
  envRows: Array<MlSourceRow | AmazonSourceRow>;
  customRows: Array<MlSourceRow | AmazonSourceRow>;
  channel: SourceChannel;
  flags: SourceFlags;
  platform: 'ml' | 'amazon';
  onToggle: (id: string, enabled: boolean) => void;
  onRemove: (id: string, platform: 'ml' | 'amazon') => void;
  getUrl: (row: MlSourceRow | AmazonSourceRow) => string;
  getKind: (row: MlSourceRow | AmazonSourceRow) => string;
}) {
  const head = (
    <TableHead>
      <TableRow>
        <TableHeaderCell>Coletar</TableHeaderCell>
        <TableHeaderCell>Nome / URL</TableHeaderCell>
        <TableHeaderCell>Origem</TableHeaderCell>
        <TableHeaderCell>Tipo</TableHeaderCell>
        <TableHeaderCell>Status</TableHeaderCell>
        <TableHeaderCell>Info</TableHeaderCell>
        <TableHeaderCell>{'\u00a0'}</TableHeaderCell>
      </TableRow>
    </TableHead>
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-base font-semibold text-text-primary">{title}</h3>
      <h4 className="text-sm font-medium text-text-secondary">Do .env</h4>
      <Table>
        {head}
        <TableBody>
          {envRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>Nenhuma fonte no .env.</TableCell>
            </TableRow>
          ) : (
            envRows.map((row) => (
              <SourceRow
                key={row.id}
                row={row}
                channel={channel}
                checked={flags[row.id] ?? false}
                onToggle={onToggle}
                url={getUrl(row)}
                kind={getKind(row)}
              />
            ))
          )}
        </TableBody>
      </Table>
      <h4 className="text-sm font-medium text-text-secondary">Links extras</h4>
      <Table>
        {head}
        <TableBody>
          {customRows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>Nenhum link extra cadastrado.</TableCell>
            </TableRow>
          ) : (
            customRows.map((row) => (
              <SourceRow
                key={row.id}
                row={row}
                channel={channel}
                checked={flags[row.id] ?? false}
                onToggle={onToggle}
                onRemove={() => onRemove(row.id, platform)}
                url={getUrl(row)}
                kind={getKind(row)}
              />
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export function SourcesPage() {
  const { channel: channelParam } = useParams();
  const { pushToast } = useToast();
  const { confirm } = useConfirm();

  const channel = isSourceChannel(channelParam) ? channelParam : null;

  const [data, setData] = useState<SourcesResponse | null>(null);
  const [flags, setFlags] = useState<SourceFlags>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [mlModalOpen, setMlModalOpen] = useState(false);
  const [amazonModalOpen, setAmazonModalOpen] = useState(false);

  useEffect(() => {
    if (!channel) return;
    setLoading(true);
    void api
      .getSources(channel)
      .then((response) => {
        setData(response);
        setFlags(buildInitialFlags(response, channel));
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Falha ao carregar fontes');
      })
      .finally(() => setLoading(false));
  }, [channel]);

  const activeCount = useMemo(() => {
    return Object.values(flags).filter(Boolean).length;
  }, [flags]);

  if (!channel) {
    return <Navigate to="/sources/whatsapp" replace />;
  }

  if (loading) {
    return <Spinner label="Carregando fontes…" />;
  }

  if (error || !data) {
    return <Alert tone="error">{error ?? 'Dados indisponíveis'}</Alert>;
  }

  const activeChannel = channel;
  const sourcesData = data;

  function applyData(response: SourcesResponse) {
    setData(response);
    setFlags(buildInitialFlags(response, activeChannel));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await api.patchSources(
        activeChannel,
        buildPatchBody(sourcesData, flags),
      );
      applyData(response);
      pushToast('Fontes atualizadas com sucesso', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar fontes', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(sourceId: string, platform: 'ml' | 'amazon') {
    const ok = await confirm({
      title: 'Remover link',
      message: 'Remover este link?',
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;
    try {
      const response =
        platform === 'ml'
          ? await api.deleteMlSource(activeChannel, sourceId)
          : await api.deleteAmazonSource(activeChannel, sourceId);
      applyData(response);
      pushToast('Link removido com sucesso', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao remover link', 'error');
    }
  }

  return (
    <Page>
      <PageHeader
        title={`Fontes de coleta — ${data.channelLabel}`}
        subtitle={`${activeCount} fonte(s) ativa(s) neste canal.`}
      />

      {data.channels.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          {data.channels.map((item) => (
            <Link
              key={item.channel}
              to={`/sources/${item.channel}`}
              className={cn(
                'rounded-lg border px-3.5 py-1.5 text-sm font-medium transition-all duration-200',
                item.active
                  ? 'border-primary/40 bg-primary/15 text-primary'
                  : 'border-border bg-bg-card text-text-secondary hover:border-border/80 hover:bg-bg-secondary hover:text-text-primary',
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}

      <section className="flex flex-col gap-6 rounded-2xl border border-border bg-bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm text-text-secondary">
            Marque as fontes coletadas para o <strong>{data.channelLabel}</strong>.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setMlModalOpen(true)}>
              Adicionar link ML
            </Button>
            <Button variant="secondary" onClick={() => setAmazonModalOpen(true)}>
              Adicionar link Amazon
            </Button>
          </div>
        </div>

        <PlatformSourcesTable
          title="Mercado Livre"
          envRows={data.mlRows.filter((row) => row.fromEnv)}
          customRows={data.mlRows.filter((row) => !row.fromEnv)}
          channel={activeChannel}
          flags={flags}
          platform="ml"
          onToggle={(id, enabled) => setFlags((current) => ({ ...current, [id]: enabled }))}
          onRemove={(id, platform) => void handleRemove(id, platform)}
          getUrl={(row) => ('category' in row ? row.category : row.source)}
          getKind={(row) => ('listingKind' in row ? row.listingKind : row.kind)}
        />

        <PlatformSourcesTable
          title="Amazon"
          envRows={data.amazonRows.filter((row) => row.fromEnv)}
          customRows={data.amazonRows.filter((row) => !row.fromEnv)}
          channel={activeChannel}
          flags={flags}
          platform="amazon"
          onToggle={(id, enabled) => setFlags((current) => ({ ...current, [id]: enabled }))}
          onRemove={(id, platform) => void handleRemove(id, platform)}
          getUrl={(row) => ('source' in row ? row.source : row.category)}
          getKind={(row) => ('kind' in row ? row.kind : row.listingKind)}
        />

        <div>
          <Button onClick={() => void handleSave()} disabled={saving}>
            {saving ? 'Salvando…' : `Salvar seleção do ${data.channelLabel}`}
          </Button>
        </div>
      </section>

      <AddSourceModal
        open={mlModalOpen}
        title="Adicionar link Mercado Livre"
        urlPlaceholder="https://www.mercadolivre.com.br/ofertas?..."
        help={`O link entra ativo só neste canal (${data.channelLabel}).`}
        onClose={() => setMlModalOpen(false)}
        onSubmit={async (body) => {
          applyData(await api.addMlSource(activeChannel, body));
          pushToast('Link adicionado com sucesso', 'success');
        }}
      />

      <AddSourceModal
        open={amazonModalOpen}
        title="Adicionar link Amazon"
        urlPlaceholder="https://www.amazon.com.br/b/node/..."
        help="Browse node, busca ou produto. Ativo só neste canal."
        onClose={() => setAmazonModalOpen(false)}
        onSubmit={async (body) => {
          applyData(await api.addAmazonSource(activeChannel, body));
          pushToast('Link adicionado com sucesso', 'success');
        }}
      />
    </Page>
  );
}
