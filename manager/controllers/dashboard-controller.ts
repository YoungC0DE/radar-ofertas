import { loadDashboardData } from '../models/dashboard-model.js';
import { validateOfferCollectionReady } from '../../src/offers/service.js';
import { enqueueOfferCollection } from '../../src/queue/index.js';
import { renderDashboard } from '../views/dashboard.js';

export async function showDashboard(
  options: {
    sendNowMessage?: string;
    sendNowError?: string;
    collectMessage?: string;
    collectError?: string;
  } = {},
): Promise<string> {
  const data = await loadDashboardData(options);
  return renderDashboard(data);
}

export async function handleCollectOffers(): Promise<{ ok: true } | { error: string }> {
  try {
    const blocker = await validateOfferCollectionReady();
    if (blocker) {
      return { error: blocker };
    }

    await enqueueOfferCollection({ force: true });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Falha ao enfileirar busca de anúncios';
    return { error: message };
  }
}
