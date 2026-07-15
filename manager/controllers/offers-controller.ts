import { saveAffiliateLinkDelaySettings, saveSearchLimit } from '../../src/config/queue-config-store.js';
import { loadOfferDetail, loadOffersPage, parsePage, parseSentFilter } from '../models/offers-model.js';
import { formatOfferMessageFromTemplate, loadMessageTemplate, loadPlaceholderVisibility, renderMessageTemplate, buildTemplateValues } from '../../src/offers/message-template.js';
import { removeAllPendingOffers, removePendingOffer, sendOfferNow } from '../../src/offers/service.js';
import { renderNotFound, renderOfferDetail } from '../views/offer-detail.js';
import { renderOffersPage } from '../views/offers.js';

export async function showOffersList(searchParams: URLSearchParams): Promise<string> {
  const filter = parseSentFilter(searchParams.get('status'));
  const page = parsePage(searchParams.get('page'));
  const cleared = searchParams.get('cleared');
  const error = searchParams.get('error');
  const clearedCount = cleared ? Number.parseInt(cleared, 10) : null;
  const data = await loadOffersPage(filter, page);
  return renderOffersPage(
    data,
    Number.isFinite(clearedCount) ? clearedCount : null,
    error,
  );
}

export async function handleDeleteAllPending(): Promise<{ count: number } | { error: string }> {
  try {
    const count = await removeAllPendingOffers();
    return { count };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao remover ofertas pendentes';
    return { error: message };
  }
}

export async function handleDeleteOffer(id: string): Promise<{ ok: true } | { error: string }> {
  try {
    await removePendingOffer(id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao remover oferta';
    return { error: message };
  }
}

export async function handleSearchLimitSave(limitRaw: string): Promise<string> {
  const limit = Number.parseInt(limitRaw, 10);
  try {
    await saveSearchLimit(limit);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar limite de busca';
    const data = await loadOffersPage('all', 1);
    return renderOffersPage(data, null, message);
  }
  const data = await loadOffersPage('all', 1);
  return renderOffersPage(data, null, null);
}

export async function handleAffiliateDelaySave(
  delayMsRaw: string,
  backlogDelayMinutesRaw: string,
  backlogThresholdRaw: string,
): Promise<string> {
  const delayMs = Number.parseInt(delayMsRaw, 10);
  const backlogDelayMinutes = Number.parseInt(backlogDelayMinutesRaw, 10);
  const backlogThreshold = Number.parseInt(backlogThresholdRaw, 10);

  try {
    await saveAffiliateLinkDelaySettings(delayMs, backlogDelayMinutes, backlogThreshold);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao salvar delay de coleta';
    const data = await loadOffersPage('all', 1);
    return renderOffersPage(data, null, message);
  }

  const data = await loadOffersPage('all', 1);
  return renderOffersPage(data, null, null, true);
}

export async function handleSendOfferNow(id: string): Promise<{ ok: true } | { error: string }> {
  try {
    await sendOfferNow(id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao enfileirar envio';
    return { error: message };
  }
}

export async function showOfferDetail(id: string): Promise<{ status: number; html: string }> {
  const { offer, database } = await loadOfferDetail(id);
  if (!database.available) {
    return { status: 503, html: renderNotFound(database.error ?? 'Banco de dados indisponível.') };
  }
  if (!offer) {
    return { status: 404, html: renderNotFound('Oferta não encontrada.') };
  }
  const [template, visibility] = await Promise.all([loadMessageTemplate(), loadPlaceholderVisibility()]);
  const messagePreview = renderMessageTemplate(template, buildTemplateValues(offer), visibility);
  return { status: 200, html: renderOfferDetail(offer, messagePreview) };
}
