import { RefreshCw, Search, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../services/api.js';
import type {
  OfferDestinationFilter,
  OfferOriginFilter,
  OfferSentFilter,
  OffersPageResponse,
  SerializedOffer,
} from '../types/api.js';
import { ApiError } from '../types/api.js';
import { CollectOffersModal } from '../components/offers/CollectOffersModal.js';
import {
  collectDeliveryErrors,
  DestinationBadges,
  OfferStatusBadge,
  resolveOfferListStatus,
} from '../components/offers/DestinationBadges.js';
import { PlatformBadge } from '../components/offers/PlatformBadge.js';
import { useConfirm } from '../components/feedback/ConfirmProvider.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Button } from '../components/ui/Button.js';
import { Checkbox } from '../components/ui/Checkbox.js';
import { Input } from '../components/ui/Input.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table.js';
import { formatCurrency, formatDate, truncateText } from '../utils/format.js';

const selectClass =
  'h-10 rounded-[10px] border border-border bg-bg-secondary pl-3 pr-9 text-sm text-text-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25';

function parseStatus(value: string | null): OfferSentFilter {
  if (value === 'pending' || value === 'sent' || value === 'error') return value;
  return 'all';
}

function parseOrigin(value: string | null): OfferOriginFilter {
  if (value === 'mercado_livre' || value === 'amazon') return value;
  return 'all';
}

function parseDestination(value: string | null): OfferDestinationFilter {
  if (value === 'whatsapp' || value === 'telegram') return value;
  return 'all';
}

function parsePage(value: string | null): number {
  const page = Number.parseInt(value ?? '1', 10);
  return Number.isFinite(page) && page > 0 ? page : 1;
}

function isOfferSendable(offer: SerializedOffer): boolean {
  return offer.sentAt == null;
}

function actionLabel(base: string, count: number): string {
  return count > 0 ? `${base} (${count})` : base;
}

export function OffersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { pushToast } = useToast();
  const { confirm } = useConfirm();

  const status = parseStatus(searchParams.get('status'));
  const origin = parseOrigin(searchParams.get('origin'));
  const destination = parseDestination(searchParams.get('destination'));
  const page = parsePage(searchParams.get('page'));

  const [data, setData] = useState<OffersPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collectModalOpen, setCollectModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [listSearch, setListSearch] = useState('');

  const filteredOffers = useMemo(() => {
    const offers = data?.offers ?? [];
    const query = listSearch.trim().toLowerCase();
    if (!query) return offers;
    return offers.filter((offer) => offer.title.toLowerCase().includes(query));
  }, [data?.offers, listSearch]);

  const pageSendableIds = useMemo(
    () => filteredOffers.filter(isOfferSendable).map((offer) => offer.id),
    [filteredOffers],
  );

  const allPageSelected =
    pageSendableIds.length > 0 && pageSendableIds.every((id) => selectedIds.has(id));

  const somePageSelected =
    pageSendableIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const selectedCount = selectedIds.size;

  const loadOffers = useCallback(async () => {
    setError(null);
    try {
      const response = await api.listOffers({ status, origin, destination, page });
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar ofertas');
    } finally {
      setLoading(false);
    }
  }, [status, origin, destination, page]);

  useEffect(() => {
    setLoading(true);
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [status, origin, destination, page]);

  function patchParams(patch: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value == null || value === 'all' || (key === 'page' && value === '1')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    setSearchParams(params);
  }

  function toggleSelectOffer(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allPageSelected) {
        for (const id of pageSendableIds) next.delete(id);
      } else {
        for (const id of pageSendableIds) next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadOffers();
    } finally {
      setRefreshing(false);
    }
  }

  async function handleCollect(payload: {
    productName?: string;
    searchLimit: number;
    sendAfterCollect: boolean;
    sendDelayMinutes?: number;
  }) {
    setActionLoading(true);
    try {
      await api.collectOffers(payload);
      pushToast('Coleta enfileirada com sucesso', 'success');
      await loadOffers();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao enfileirar coleta', 'error');
      throw err;
    } finally {
      setActionLoading(false);
    }
  }

  async function handleClearSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const ok = await confirm({
      title: 'Remover ofertas',
      message: `Remover ${ids.length} oferta(s) selecionada(s)? Elas não serão enviadas.`,
      confirmLabel: 'Remover',
      tone: 'danger',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => api.deleteOffer(id)));
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        pushToast(
          `${succeeded} oferta(s) removida(s)`,
          failed > 0 ? 'info' : 'success',
        );
      }
      if (failed > 0) {
        pushToast(`${failed} oferta(s) não puderam ser removidas`, 'error');
      }

      clearSelection();
      await loadOffers();
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteOffer(id: string) {
    const ok = await confirm({
      title: 'Apagar oferta',
      message: 'Apagar esta oferta pendente? Ela não será enviada.',
      confirmLabel: 'Apagar',
      tone: 'danger',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      await api.deleteOffer(id);
      pushToast('Oferta removida', 'success');
      setSelectedIds((current) => {
        if (!current.has(id)) return current;
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      await loadOffers();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao apagar oferta', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleForceSendSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const ok = await confirm({
      title: 'Forçar envio',
      message: `Forçar envio de ${ids.length} oferta(s)? Ignora janela operacional e delay entre envios.`,
      confirmLabel: 'Enviar agora',
    });
    if (!ok) return;

    setActionLoading(true);
    try {
      const results = await Promise.allSettled(ids.map((id) => api.sendOfferNow(id)));
      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;

      if (succeeded > 0) {
        pushToast(
          `${succeeded} oferta(s) enfileirada(s) para envio imediato`,
          failed > 0 ? 'info' : 'success',
        );
      }
      if (failed > 0) {
        pushToast(`${failed} oferta(s) não puderam ser enfileiradas`, 'error');
      }

      clearSelection();
      await loadOffers();
    } finally {
      setActionLoading(false);
    }
  }

  if (loading && !data) {
    return <Spinner label="Carregando ofertas…" />;
  }

  const selectionActionsDisabled = actionLoading || selectedCount === 0;

  return (
    <Page>
      <PageHeader
        title="Ofertas"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => void handleRefresh()}
              disabled={refreshing || loading || actionLoading}
              aria-label="Atualizar lista de ofertas"
            >
              <RefreshCw
                className={`size-4 shrink-0 ${refreshing ? 'animate-spin' : ''}`}
                aria-hidden
              />
              Atualizar
            </Button>
            <Button onClick={() => setCollectModalOpen(true)} disabled={actionLoading || refreshing}>
              Buscar Ofertas
            </Button>
            {data?.database.available ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="danger"
                  onClick={() => void handleClearSelected()}
                  disabled={selectionActionsDisabled || refreshing}
                >
                  {actionLabel('Limpar', selectedCount)}
                </Button>
                <Button
                  onClick={() => void handleForceSendSelected()}
                  disabled={selectionActionsDisabled || refreshing}
                >
                  {actionLabel('Forçar envio', selectedCount)}
                </Button>
              </div>
            ) : null}
          </div>
        }
      />

      {error ? <Alert tone="error">{error}</Alert> : null}

      {data && !data.database.available ? (
        <Alert tone="error">
          {`PostgreSQL indisponível — ${data.database.error ?? 'erro de conexão'}`}
        </Alert>
      ) : null}

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          type="search"
          value={listSearch}
          onChange={(event) => setListSearch(event.target.value)}
          placeholder="Buscar na lista…"
          icon={<Search className="size-4" />}
          wrapperClassName="min-w-[220px] flex-1"
          aria-label="Buscar ofertas na lista"
        />
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Origem
          <select
            className={selectClass}
            value={origin}
            onChange={(event) =>
              patchParams({ origin: event.target.value, page: null })
            }
          >
            <option value="all">Todos</option>
            <option value="mercado_livre">Mercado Livre</option>
            <option value="amazon">Amazon</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Destino
          <select
            className={selectClass}
            value={destination}
            onChange={(event) =>
              patchParams({ destination: event.target.value, page: null })
            }
          >
            <option value="all">Todos</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="telegram">Telegram</option>
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-text-secondary">
          Status
          <select
            className={selectClass}
            value={status}
            onChange={(event) =>
              patchParams({ status: event.target.value, page: null })
            }
          >
            <option value="all">Todos</option>
            <option value="pending">Pendente</option>
            <option value="error">Erro</option>
            <option value="sent">Enviado</option>
          </select>
        </label>
      </div>

      {data ? (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell className="w-10">
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={somePageSelected}
                    disabled={actionLoading || pageSendableIds.length === 0}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Selecionar todas as ofertas pendentes da página"
                  />
                </TableHeaderCell>
                <TableHeaderCell>Título</TableHeaderCell>
                <TableHeaderCell>Origem</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
                <TableHeaderCell>Destino</TableHeaderCell>
                <TableHeaderCell>Preço</TableHeaderCell>
                <TableHeaderCell>Desconto</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Envio agendado</TableHeaderCell>
                <TableHeaderCell>Coleta</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!data.database.available ? (
                <TableRow>
                  <TableCell colSpan={10}>{data.database.error ?? 'Banco indisponível'}</TableCell>
                </TableRow>
              ) : filteredOffers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10}>
                    {listSearch.trim()
                      ? 'Nenhuma oferta corresponde à busca.'
                      : 'Nenhuma oferta encontrada.'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredOffers.map((offer) => {
                  const deliveries = data.deliveriesByOfferId[offer.id];
                  const scheduleAt = offer.sentAt
                    ? null
                    : (data.scheduleByOfferId[offer.id] ?? null);
                  const sendable = isOfferSendable(offer);
                  const listStatus = resolveOfferListStatus(offer, deliveries);
                  const errorMessage = collectDeliveryErrors(deliveries);

                  return (
                    <TableRow key={offer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(offer.id)}
                          disabled={actionLoading || !sendable}
                          onChange={() => toggleSelectOffer(offer.id)}
                          aria-label={`Selecionar oferta ${offer.title}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Link className="text-primary hover:underline" to={`/offers/${offer.id}`}>
                          {truncateText(offer.title, 50)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <PlatformBadge offer={offer} />
                      </TableCell>
                      <TableCell>{offer.score}</TableCell>
                      <TableCell>
                        <DestinationBadges deliveries={deliveries} />
                      </TableCell>
                      <TableCell>{formatCurrency(offer.price)}</TableCell>
                      <TableCell>{offer.discount != null ? `${offer.discount}%` : '—'}</TableCell>
                      <TableCell>
                        <OfferStatusBadge status={listStatus} errorMessage={errorMessage} />
                      </TableCell>
                      <TableCell>{scheduleAt ? formatDate(scheduleAt) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-between gap-2.5">
                          <span>{formatDate(offer.createdAt)}</span>
                          {!offer.sentAt ? (
                            <button
                              type="button"
                              className="inline-flex cursor-pointer items-center justify-center rounded-md border border-border bg-bg-card p-1.5 text-error transition-colors hover:border-error/45 hover:bg-error/10 disabled:cursor-not-allowed disabled:opacity-50"
                              title="Apagar oferta pendente"
                              aria-label="Apagar oferta"
                              disabled={actionLoading}
                              onClick={() => void handleDeleteOffer(offer.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
            {data.page > 1 ? (
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-medium text-primary hover:underline"
                onClick={() => patchParams({ page: String(data.page - 1) })}
              >
                ← Anterior
              </button>
            ) : null}
            <span>
              Página {data.page} de {data.totalPages} ({data.total} ofertas)
            </span>
            {data.page < data.totalPages ? (
              <button
                type="button"
                className="cursor-pointer border-0 bg-transparent p-0 font-medium text-primary hover:underline"
                onClick={() => patchParams({ page: String(data.page + 1) })}
              >
                Próxima →
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      <CollectOffersModal
        open={collectModalOpen}
        defaultSearchLimit={Math.min(50, data?.searchLimit ?? 20)}
        onClose={() => setCollectModalOpen(false)}
        onSubmit={handleCollect}
      />
    </Page>
  );
}
