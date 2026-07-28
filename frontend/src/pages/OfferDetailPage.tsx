import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { api } from '../services/api.js';
import type { OfferDetailResponse } from '../types/api.js';
import { ApiError } from '../types/api.js';
import { PlatformBadge } from '../components/offers/PlatformBadge.js';
import { OfferStatusBadge } from '../components/offers/DestinationBadges.js';
import { useToast } from '../components/feedback/ToastProvider.js';
import { Alert } from '../components/ui/Alert.js';
import { Button } from '../components/ui/Button.js';
import { Card } from '../components/ui/Card.js';
import { Page } from '../components/ui/Layout.js';
import { Spinner } from '../components/ui/Spinner.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import {
  detectOfferPlatform,
  formatOfferRating,
  formatSoldQuantity,
  offerPlatformLabel,
  offerProductIdLabel,
  parseAmazonReviewsCount,
} from '../utils/platform.js';

type DetailRowProps = {
  label: string;
  value: ReactNode;
  hint?: string;
};

function DetailRow({ label, value, hint }: DetailRowProps) {
  return (
    <div className="grid gap-1 border-b border-border/50 px-5 py-4 last:border-0 sm:grid-cols-[200px_1fr] sm:gap-5">
      <div className="text-sm font-semibold text-text-primary">{label}</div>
      <div>
        <div className="flex flex-wrap items-center gap-2 break-words text-sm text-text-primary">
          {value}
        </div>
        {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
      </div>
    </div>
  );
}

export function OfferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { pushToast } = useToast();

  const [data, setData] = useState<OfferDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    void api
      .getOffer(id)
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : 'Falha ao carregar oferta');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSendNow() {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.sendOfferNow(id);
      pushToast('Oferta enfileirada para envio imediato', 'success');
      const refreshed = await api.getOffer(id);
      setData(refreshed);
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao enfileirar envio', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!id) return;
    const ok = window.confirm('Apagar esta oferta pendente? Ela não será enviada.');
    if (!ok) return;

    setActionLoading(true);
    try {
      await api.deleteOffer(id);
      pushToast('Oferta removida', 'success');
      navigate('/offers');
    } catch (err) {
      pushToast(err instanceof ApiError ? err.message : 'Falha ao apagar oferta', 'error');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCopyAffiliateLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopyFeedback(true);
      window.setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      pushToast('Não foi possível copiar o link', 'error');
    }
  }

  if (loading) {
    return <Spinner label="Carregando oferta…" />;
  }

  if (error || !data) {
    return (
      <Page>
        <Alert tone="error">{error ?? 'Oferta não encontrada'}</Alert>
        <p>
          <Link className="text-primary hover:underline" to="/offers">
            ← Voltar para ofertas
          </Link>
        </p>
      </Page>
    );
  }

  const { offer, messagePreview, coupon } = data;
  const platform = detectOfferPlatform(offer);
  const platformLabel = offerPlatformLabel(platform);
  const productIdLabel = offerProductIdLabel(platform);
  const isAmazon = platform === 'amazon';
  const reviewsCount = isAmazon ? parseAmazonReviewsCount(offer.salesRank) : null;
  const ratingLabel = formatOfferRating(offer.rating, platform, reviewsCount);
  const soldLabel = formatSoldQuantity(offer.soldQuantity, platform);
  const isPending = !offer.sentAt;

  return (
    <Page>
      <p>
        <Link className="text-primary hover:underline" to="/offers">
          ← Voltar para ofertas
        </Link>
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <PlatformBadge offer={offer} />
          <h1 className="mt-2 text-xl font-semibold leading-snug text-text-primary">{offer.title}</h1>
          <p className="mt-1 text-sm text-text-secondary">{platformLabel}</p>
        </div>
        {isPending ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => void handleSendNow()} disabled={actionLoading}>
              Enviar agora
            </Button>
            <Button variant="danger" onClick={() => void handleDelete()} disabled={actionLoading}>
              Apagar
            </Button>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-bg-card shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
        <DetailRow
          label="Origem"
          value={
            <>
              <PlatformBadge offer={offer} />{' '}
              <span className="text-sm text-text-secondary">{platformLabel}</span>
            </>
          }
        />
        <DetailRow label="ID interno" value={<code className="rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">{offer.id}</code>} />
        <DetailRow label={productIdLabel} value={<code className="rounded bg-bg-secondary px-1.5 py-0.5 text-[0.82rem]">{offer.mercadoLivreId}</code>} />
        <DetailRow label="Score" value={String(offer.score)} />
        <DetailRow label="Preço" value={formatCurrency(offer.price)} />
        <DetailRow
          label="Preço anterior"
          value={offer.oldPrice != null ? formatCurrency(offer.oldPrice) : '—'}
        />
        <DetailRow label="Desconto" value={offer.discount != null ? `${offer.discount}%` : '—'} />
        <DetailRow label="Avaliação" value={ratingLabel} />
        <DetailRow label={isAmazon ? 'Compras no mês' : 'Vendidos'} value={soldLabel} />
        {!isAmazon && offer.salesRank ? (
          <DetailRow label="Ranking" value={offer.salesRank} />
        ) : null}
        <DetailRow
          label="Vendedor"
          value={
            offer.seller ? (
              <>
                {offer.seller}
                {offer.officialStore ? (
                  <span className="text-sm text-text-secondary"> ✅ Loja oficial</span>
                ) : null}
              </>
            ) : (
              '—'
            )
          }
        />
        {isAmazon ? (
          <DetailRow
            label="Cupom"
            value={
              coupon ? (
                <span className="inline-block rounded-lg border border-primary/30 bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
                  {coupon}
                </span>
              ) : (
                '—'
              )
            }
            hint="Desconto ativo na página do produto"
          />
        ) : null}
        <DetailRow label="Mais vendido" value={offer.bestSeller ? '🏆 Sim' : '—'} />
        <DetailRow label="Status" value={<OfferStatusBadge sentAt={offer.sentAt} />} />
        <DetailRow label="Salva em" value={formatDate(offer.createdAt)} />
        <DetailRow label="Enviada em" value={formatDate(offer.sentAt)} />
        <DetailRow
          label="Página do produto"
          value={
            offer.permalink ? (
              <a
                className="text-primary hover:underline"
                href={offer.permalink}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir produto
              </a>
            ) : (
              '—'
            )
          }
        />
        <DetailRow
          label="Link afiliado"
          value={
            offer.affiliateLink ? (
              <div className="flex flex-wrap items-center gap-2.5 break-all">
                <a
                  className="text-primary hover:underline"
                  href={offer.affiliateLink}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {offer.affiliateLink}
                </a>
                <Button
                  variant="secondary"
                  onClick={() => {
                    if (offer.affiliateLink) void handleCopyAffiliateLink(offer.affiliateLink);
                  }}
                >
                  Copiar
                </Button>
                {copyFeedback ? (
                  <span className="text-xs font-medium text-success">Copiado!</span>
                ) : null}
              </div>
            ) : (
              '—'
            )
          }
          hint={isAmazon ? 'Formato: amazon.com.br/dp/ASIN?tag=sua-loja' : undefined}
        />
        <DetailRow
          label="Imagem"
          value={
            offer.image ? (
              <a
                className="text-primary hover:underline"
                href={offer.image}
                target="_blank"
                rel="noopener noreferrer"
              >
                Abrir imagem
              </a>
            ) : (
              '—'
            )
          }
        />
      </div>

      <Card title="Mensagem que o bot enviará">
        <p className="mb-4 text-sm text-text-secondary">
          <Link className="text-primary hover:underline" to="/template">
            Editar template →
          </Link>
        </p>
        <pre className="m-0 whitespace-pre-wrap rounded-xl border border-border bg-bg-secondary p-3.5 text-sm">
          {messagePreview}
        </pre>
      </Card>
    </Page>
  );
}
