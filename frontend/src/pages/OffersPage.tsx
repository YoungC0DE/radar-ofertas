import { Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { api } from '../services/api.js';
import type { OfferSentFilter, OffersPageResponse, SerializedOffer } from '../types/api.js';
import { ApiError } from '../types/api.js';
import { AffiliateDelayModal } from '../components/offers/AffiliateDelayModal.js';
import {
  DestinationBadges,
  OfferStatusBadge,
} from '../components/offers/DestinationBadges.js';
import { PlatformBadge } from '../components/offers/PlatformBadge.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Button } from '../components/ui/Button.js';
import { Checkbox } from '../components/ui/Checkbox.js';
import { FilterChip, FilterGroup } from '../components/ui/FilterChip.js';
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

const FILTERS: Array<{ value: OfferSentFilter; label: string }> = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'sent', label: 'Enviadas' },
];

function parseFilter(value: string | null): OfferSentFilter {
  if (value === 'pending' || value === 'sent') return value;
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

  const filter = parseFilter(searchParams.get('status'));
  const page = parsePage(searchParams.get('page'));

  const [data, setData] = useState<OffersPageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchLimit, setSearchLimit] = useState('');
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const pageSendableIds = useMemo(
    () => data?.offers.filter(isOfferSendable).map((offer) => offer.id) ?? [],
    [data?.offers],
  );

  const allPageSelected =
    pageSendableIds.length > 0 && pageSendableIds.every((id) => selectedIds.has(id));

  const somePageSelected =
    pageSendableIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  const selectedCount = selectedIds.size;

  const loadOffers = useCallback(async () => {
    setError(null);
    try {
      const response = await api.listOffers({ status: filter, page });
      setData(response);
      setSearchLimit(String(response.searchLimit));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar ofertas');
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    setLoading(true);
    void loadOffers();
  }, [loadOffers]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filter, page]);

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

  function setFilter(next: OfferSentFilter) {
    const params = new URLSearchParams(searchParams);
    if (next === 'all') params.delete('status');
    else params.set('status', next);
    params.delete('page');
    setSearchParams(params);
  }

  function setPage(next: number) {
    const params = new URLSearchParams(searchParams);
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    setSearchParams(params);
  }

  async function handleCollect() {
    setActionLoading(true);
    try {
      await api.collectOffers();
      pushToast('Coleta enfileirada com sucesso', 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao enfileirar coleta', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSearchLimitSubmit(event: FormEvent) {
    event.preventDefault();
    const value = Number.parseInt(searchLimit, 10);
    if (!Number.isFinite(value)) return;

    setActionLoading(true);
    try {
      await api.patchSearchLimit(value);
      pushToast('Limite de busca salvo', 'success');
      await loadOffers();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar limite', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAffiliateDelaySave(body: {
    affiliateDelayMs: number;
    affiliateBacklogDelayMinutes: number;
    affiliateBacklogThreshold: number;
  }) {
    await api.patchAffiliateDelay(body);
    pushToast('Configuração de delay salva', 'success');
    await loadOffers();
  }

  async function handleClearSelected() {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const ok = window.confirm(
      `Remover ${ids.length} oferta(s) selecionada(s)? Elas não serão enviadas.`,
    );
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
    const ok = window.confirm('Apagar esta oferta pendente? Ela não será enviada.');
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

    const ok = window.confirm(
      `Forçar envio de ${ids.length} oferta(s)? Ignora janela operacional e delay entre envios.`,
    );
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

  const delayLabel =
    data?.affiliateDelay.backlogDelayMinutes === 1
      ? '1 min'
      : `${data?.affiliateDelay.backlogDelayMinutes ?? 0} min`;

  const selectionActionsDisabled = actionLoading || selectedCount === 0;

  return (
    <Page>
      <PageHeader
        title="Ofertas"
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={() => void handleCollect()} disabled={actionLoading}>
              Buscar novos anúncios
            </Button>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => void handleSearchLimitSubmit(event)}
            >
              <span className="whitespace-nowrap text-sm text-text-secondary">Buscar até</span>
              <Input
                id="search-limit-input"
                type="number"
                className="!w-[72px] text-center"
                wrapperClassName="!gap-0"
                value={searchLimit}
                onChange={(event) => setSearchLimit(event.target.value)}
                min={1}
                max={500}
                step={1}
              />
              <span className="whitespace-nowrap text-sm text-text-secondary">ofertas</span>
              <Button type="submit" variant="secondary" disabled={actionLoading}>
                Salvar
              </Button>
            </form>
            {data ? (
              <Button variant="secondary" onClick={() => setDelayModalOpen(true)} disabled={actionLoading}>
                Delay ({delayLabel})
              </Button>
            ) : null}
            {data?.database.available ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="danger"
                  onClick={() => void handleClearSelected()}
                  disabled={selectionActionsDisabled}
                >
                  {actionLabel('Limpar', selectedCount)}
                </Button>
                <Button
                  onClick={() => void handleForceSendSelected()}
                  disabled={selectionActionsDisabled}
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

      <FilterGroup>
        {FILTERS.map((item) => (
          <FilterChip
            key={item.value}
            active={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </FilterChip>
        ))}
      </FilterGroup>

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
                <TableHeaderCell>Origem</TableHeaderCell>
                <TableHeaderCell>ID</TableHeaderCell>
                <TableHeaderCell>Destino</TableHeaderCell>
                <TableHeaderCell>Título</TableHeaderCell>
                <TableHeaderCell>Score</TableHeaderCell>
                <TableHeaderCell>Preço</TableHeaderCell>
                <TableHeaderCell>Desconto</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell>Previsão de envio</TableHeaderCell>
                <TableHeaderCell>Coletada em</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!data.database.available ? (
                <TableRow>
                  <TableCell colSpan={11}>{data.database.error ?? 'Banco indisponível'}</TableCell>
                </TableRow>
              ) : data.offers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={11}>Nenhuma oferta encontrada.</TableCell>
                </TableRow>
              ) : (
                data.offers.map((offer) => {
                  const scheduleAt = offer.sentAt
                    ? null
                    : (data.scheduleByOfferId[offer.id] ?? null);
                  const sendable = isOfferSendable(offer);

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
                        <PlatformBadge offer={offer} />
                      </TableCell>
                      <TableCell>
                        <Link className="text-primary hover:underline" to={`/offers/${offer.id}`}>
                          {truncateText(offer.id, 10)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <DestinationBadges deliveries={data.deliveriesByOfferId[offer.id]} />
                      </TableCell>
                      <TableCell>{truncateText(offer.title, 50)}</TableCell>
                      <TableCell>{offer.score}</TableCell>
                      <TableCell>{formatCurrency(offer.price)}</TableCell>
                      <TableCell>{offer.discount != null ? `${offer.discount}%` : '—'}</TableCell>
                      <TableCell>
                        <OfferStatusBadge sentAt={offer.sentAt} />
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
                onClick={() => setPage(data.page - 1)}
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
                onClick={() => setPage(data.page + 1)}
              >
                Próxima →
              </button>
            ) : null}
          </div>
        </>
      ) : null}

      {data ? (
        <AffiliateDelayModal
          open={delayModalOpen}
          settings={data.affiliateDelay}
          onClose={() => setDelayModalOpen(false)}
          onSave={handleAffiliateDelaySave}
        />
      ) : null}
    </Page>
  );
}
