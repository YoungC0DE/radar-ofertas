import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';

import { api } from '../services/api.js';
import type { CouponsResponse, MlCoupon } from '../types/api.js';
import { ApiError } from '../types/api.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { PageHeader } from '../components/layout/PageHeader.js';
import { Alert } from '../components/ui/Alert.js';
import { Badge } from '../components/ui/Badge.js';
import { Button } from '../components/ui/Button.js';
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
import { formatDate } from '../utils/format.js';

function couponStatusLabel(status: MlCoupon['status']): string {
  const map: Record<MlCoupon['status'], string> = {
    available: 'Disponível',
    generated: 'Gerado',
    expired: 'Expirado',
    unknown: '—',
  };
  return map[status] ?? status;
}

function couponStatusTone(status: MlCoupon['status']): 'success' | 'warning' | 'neutral' {
  if (status === 'available') return 'success';
  if (status === 'expired') return 'warning';
  return 'neutral';
}

type StoreLinkEditorProps = {
  coupon: MlCoupon;
  onSave: (storeUrl: string) => Promise<void>;
};

function StoreLinkEditor({ coupon, onSave }: StoreLinkEditorProps) {
  const [value, setValue] = useState(coupon.storeUrl ?? '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValue(coupon.storeUrl ?? '');
  }, [coupon.storeUrl]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await onSave(value.trim());
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="flex min-w-[200px] flex-wrap items-center gap-2" onSubmit={(event) => void handleSubmit(event)}>
      <Input
        type="url"
        className="min-w-[180px]"
        wrapperClassName="flex-1 min-w-[180px]"
        value={value}
        placeholder="https://lista.mercadolivre.com.br/..."
        title="Link completo da loja — será encurtado ao enviar"
        onChange={(event) => setValue(event.target.value)}
      />
      <Button type="submit" variant="secondary" disabled={loading}>
        {loading ? 'Salvando…' : 'Salvar'}
      </Button>
    </form>
  );
}

export function CouponsPage() {
  const { pushToast } = useToast();
  const [data, setData] = useState<CouponsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    setError(null);
    try {
      const response = await api.getCoupons();
      setData(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar cupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const response = await api.refreshCoupons();
      setData(response);
      pushToast(
        `${response.count} cupom(ns) encontrado(s)${response.source ? ` via ${response.source}` : ''}`,
        'success',
      );
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao atualizar cupons', 'error');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleSaveStoreLink(coupon: MlCoupon, storeUrl: string) {
    try {
      await api.patchCouponStoreLink(coupon.id, {
        storeUrl,
        ...(coupon.code ? { code: coupon.code } : {}),
      });
      pushToast('Link da loja salvo', 'success');
      await loadCoupons();
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao salvar link', 'error');
    }
  }

  async function handleSend(coupon: MlCoupon) {
    setSendingId(coupon.id);
    try {
      const response = await api.sendCoupon(coupon.id, coupon.code ? { code: coupon.code } : {});
      pushToast(response.message, 'success');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao enviar cupom', 'error');
    } finally {
      setSendingId(null);
    }
  }

  if (loading) {
    return <Spinner label="Carregando cupons…" />;
  }

  if (error) {
    return <Alert tone="error">{error}</Alert>;
  }

  return (
    <Page>
      <PageHeader
        title="Cupons de afiliado"
        subtitle={
          data?.scrapedAt
            ? `Última busca: ${formatDate(data.scrapedAt)}`
            : 'Busque cupons no hub de afiliados do Mercado Livre'
        }
        actions={
          <Button onClick={() => void handleRefresh()} disabled={refreshing}>
            {refreshing ? 'Atualizando…' : 'Atualizar cupons'}
          </Button>
        }
      />

      {data?.coupons.length === 0 ? (
        <p className="text-sm text-text-secondary">
          Nenhum cupom carregado ainda. Clique em <strong>Atualizar cupons</strong> para buscar no
          Mercado Livre.
        </p>
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Cupom</TableHeaderCell>
              <TableHeaderCell>Desconto</TableHeaderCell>
              <TableHeaderCell>Código</TableHeaderCell>
              <TableHeaderCell>Link da loja</TableHeaderCell>
              <TableHeaderCell>Categoria</TableHeaderCell>
              <TableHeaderCell>Compra mínima</TableHeaderCell>
              <TableHeaderCell>Validade</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
              <TableHeaderCell>Ação</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.coupons.map((coupon) => (
              <TableRow key={`${coupon.id}-${coupon.code ?? ''}`}>
                <TableCell>
                  <strong>{coupon.storeName || coupon.title}</strong>
                  {coupon.description ? (
                    <div className="text-sm text-text-secondary">
                      {coupon.description.slice(0, 120)}
                      {coupon.description.length > 120 ? '…' : ''}
                    </div>
                  ) : null}
                </TableCell>
                <TableCell>{coupon.discountLabel || '—'}</TableCell>
                <TableCell>
                  {coupon.code ? (
                    <code className="rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">
                      {coupon.code}
                    </code>
                  ) : (
                    '—'
                  )}
                </TableCell>
                <TableCell>
                  <StoreLinkEditor
                    coupon={coupon}
                    onSave={(storeUrl) => handleSaveStoreLink(coupon, storeUrl)}
                  />
                </TableCell>
                <TableCell>{coupon.category || '—'}</TableCell>
                <TableCell>{coupon.minPurchase || '—'}</TableCell>
                <TableCell>{coupon.expiresAt || '—'}</TableCell>
                <TableCell>
                  <Badge tone={couponStatusTone(coupon.status)}>
                    {couponStatusLabel(coupon.status)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {coupon.status === 'available' ? (
                    <Button
                      variant="secondary"
                      disabled={sendingId === coupon.id}
                      onClick={() => void handleSend(coupon)}
                    >
                      {sendingId === coupon.id ? 'Enviando…' : 'Enviar ao canal'}
                    </Button>
                  ) : (
                    '—'
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Page>
  );
}
