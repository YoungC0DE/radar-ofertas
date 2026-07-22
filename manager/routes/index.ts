import type { IncomingMessage, ServerResponse } from 'node:http';

import { env } from '../../src/config/env.js';

import { prisma } from '../../src/database/client.js';
import { closeLogStore } from '../../src/utils/log-store.js';

import { logger } from '../../src/utils/logger.js';

import { handleCollectOffers, showDashboard } from '../controllers/dashboard-controller.js';
import { toManagerErrorMessage } from '../views/error-message.js';
import { escapeHtml } from '../views/helpers.js';
import { renderLayout } from '../views/layout.js';

import { showOfferDetail, showOffersList, handleDeleteAllPending, handleDeleteOffer, handleAffiliateDelaySave, handleSendOfferNow, handleSearchLimitSave } from '../controllers/offers-controller.js';

import { handleTemplateSave, handleCouponTemplateSave, showTemplatePage, handleAutoMessageCreate, handleAutoMessageDelete, handleAutoMessageSendNow, handleAutoMessageUpdate } from '../controllers/template-controller.js';
import { handleChannelLinkSave, handleBrandSave, handleCouponsUrlSave, handleOperatingHoursSave, handleScoreSave, handleSendIntervalSave, handleSenderDelaySave, showSettingsPage } from '../controllers/settings-controller.js';
import { getLogsJson, showLogsPage } from '../controllers/logs-controller.js';
import { getCouponsApiJson, handleCouponSend, handleCouponsRefresh, showCouponsPage } from '../controllers/coupons-controller.js';
import {
  handleSourceAdd,
  handleSourceFlagsSave,
  handleSourceRemove,
  parseSourcesChannel,
  showSourcesPage,
} from '../controllers/sources-controller.js';
import {
  cancelMercadoLivreConnectJson,
  finishMercadoLivreConnectJson,
  getMercadoLivreConnectJson,
  getTelegramConnectJson,
  getWhatsAppConnectJson,
  startMercadoLivreConnectJson,
  startWhatsAppConnectJson,
} from '../controllers/connection-controller.js';
import {
  getPrismaJson,
  getWorkerJson,
  parseChannelParam,
  restartWorkerJson,
  runPrismaGenerateJson,
  startWorkerJson,
  stopWorkerJson,
} from '../controllers/process-controller.js';



function sendHtml(res: ServerResponse, status: number, html: string): void {

  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });

  res.end(html);

}



function sendRedirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { Location: location });
  res.end();
}

function sendText(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function sendJson(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}



function isAuthorized(req: IncomingMessage, url: URL): boolean {

  const token = env.MANAGER_TOKEN;

  if (!token) return true;



  const queryToken = url.searchParams.get('token');

  if (queryToken === token) return true;



  const auth = req.headers.authorization;

  if (auth === `Bearer ${token}`) return true;



  return false;

}



function normalizePath(pathname: string): string {

  if (pathname.endsWith('/') && pathname.length > 1) {

    return pathname.slice(0, -1);

  }

  return pathname;

}



async function readFormBody(req: IncomingMessage): Promise<string> {

  const chunks: Buffer[] = [];

  for await (const chunk of req) {

    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));

  }

  return Buffer.concat(chunks).toString('utf8');

}



function parseFormUrlEncoded(body: string): Record<string, string> {

  const params = new URLSearchParams(body);

  const result: Record<string, string> = {};

  for (const [key, value] of params.entries()) {

    result[key] = value;

  }

  return result;

}



export async function handleManagerRequest(

  req: IncomingMessage,

  res: ServerResponse,

): Promise<void> {

  const host = req.headers.host ?? 'localhost';

  const url = new URL(req.url ?? '/', `http://${host}`);



  if (!isAuthorized(req, url)) {

    sendText(res, 401, 'Unauthorized — defina MANAGER_TOKEN ou use ?token=');

    return;

  }



  const path = normalizePath(url.pathname);

  const method = req.method ?? 'GET';



  try {

    if (path === '/manager/template' && method === 'GET') {

      sendHtml(res, 200, await showTemplatePage());

      return;

    }



    if (path === '/manager/settings' && method === 'GET') {
      sendHtml(res, 200, await showSettingsPage());
      return;
    }

    // Fontes de coleta por canal (páginas separadas no menu lateral).
    const sourcesPageMatch = path.match(/^\/manager\/sources\/([^/]+)$/);
    if (sourcesPageMatch && method === 'GET') {
      const channel = parseSourcesChannel(sourcesPageMatch[1]);
      sendHtml(res, 200, await showSourcesPage(channel));
      return;
    }

    if (sourcesPageMatch && method === 'POST') {
      const channel = parseSourcesChannel(sourcesPageMatch[1]);
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSourceFlagsSave(channel, form));
      return;
    }

    const sourcesAddMatch = path.match(/^\/manager\/sources\/([^/]+)\/add$/);
    if (sourcesAddMatch && method === 'POST') {
      const channel = parseSourcesChannel(sourcesAddMatch[1]);
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSourceAdd(channel, form));
      return;
    }

    const sourcesRemoveMatch = path.match(/^\/manager\/sources\/([^/]+)\/remove\/([^/]+)$/);
    if (sourcesRemoveMatch && method === 'POST') {
      const channel = parseSourcesChannel(sourcesRemoveMatch[1]);
      sendHtml(res, 200, await handleSourceRemove(channel, decodeURIComponent(sourcesRemoveMatch[2] ?? '')));
      return;
    }

    if (path === '/manager/logs' && method === 'GET') {
      sendHtml(res, 200, await showLogsPage(url.searchParams));
      return;
    }

    if (path === '/manager/coupons' && method === 'GET') {
      sendHtml(res, 200, await showCouponsPage());
      return;
    }

    if (path === '/manager/coupons/refresh' && method === 'POST') {
      sendHtml(res, 200, await handleCouponsRefresh());
      return;
    }

    const couponSendMatch = path.match(/^\/manager\/coupons\/([^/]+)\/send$/);
    if (couponSendMatch && method === 'POST') {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(
        res,
        200,
        await handleCouponSend(decodeURIComponent(couponSendMatch[1]!), form.code ?? null),
      );
      return;
    }

    if (path === '/manager/api/coupons' && method === 'GET') {
      sendJson(res, 200, getCouponsApiJson());
      return;
    }

    if (path === '/manager/api/logs' && method === 'GET') {
      sendJson(res, 200, await getLogsJson(url.searchParams));
      return;
    }

    if (path === '/manager/settings/send-interval' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleSendIntervalSave(form.intervalMinutes ?? ''));
      return;
    }

    if (path === '/manager/settings/sender-delay' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleSenderDelaySave(form.senderDelayMinutes ?? ''));
      return;
    }

    if (path === '/manager/settings/brand' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleBrandSave(form));
      return;
    }

    if (path === '/manager/settings/score' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleScoreSave(form));
      return;
    }

    if (path === '/manager/settings/operating-hours' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleOperatingHoursSave(form));
      return;
    }

    if (path === '/manager/settings/channel-link' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleChannelLinkSave(form.inviteLink ?? ''));
      return;
    }

    if (path === '/manager/settings/coupons-url' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleCouponsUrlSave(form.couponsUrl ?? ''));
      return;
    }


    if (path === '/manager/settings/connect/wa/start' && method === 'POST') {
      sendJson(res, 200, startWhatsAppConnectJson());
      return;
    }

    if (path === '/manager/settings/connect/wa/status' && method === 'GET') {
      sendJson(res, 200, getWhatsAppConnectJson());
      return;
    }

    if (path === '/manager/settings/connect/ml/start' && method === 'POST') {
      sendJson(res, 200, startMercadoLivreConnectJson());
      return;
    }

    if (path === '/manager/settings/connect/ml/finish' && method === 'POST') {
      sendJson(res, 200, await finishMercadoLivreConnectJson());
      return;
    }

    if (path === '/manager/settings/connect/ml/cancel' && method === 'POST') {
      sendJson(res, 200, await cancelMercadoLivreConnectJson());
      return;
    }

    if (path === '/manager/settings/connect/ml/status' && method === 'GET') {
      sendJson(res, 200, getMercadoLivreConnectJson());
      return;
    }

    if (path === '/manager/settings/connect/telegram/status' && method === 'GET') {
      sendJson(res, 200, await getTelegramConnectJson());
      return;
    }

    // ?channel=telegram controla o worker do Telegram; sem o parâmetro, WhatsApp.
    if (path === '/manager/settings/worker/start' && method === 'POST') {
      sendJson(res, 200, await startWorkerJson(parseChannelParam(url.searchParams.get('channel'))));
      return;
    }

    if (path === '/manager/settings/worker/restart' && method === 'POST') {
      sendJson(res, 200, await restartWorkerJson(parseChannelParam(url.searchParams.get('channel'))));
      return;
    }

    if (path === '/manager/settings/worker/stop' && method === 'POST') {
      sendJson(res, 200, await stopWorkerJson(parseChannelParam(url.searchParams.get('channel'))));
      return;
    }

    if (path === '/manager/settings/worker/status' && method === 'GET') {
      sendJson(res, 200, await getWorkerJson(parseChannelParam(url.searchParams.get('channel'))));
      return;
    }

    if (path === '/manager/settings/prisma/generate' && method === 'POST') {
      sendJson(res, 200, runPrismaGenerateJson());
      return;
    }

    if (path === '/manager/settings/prisma/status' && method === 'GET') {
      sendJson(res, 200, getPrismaJson());
      return;
    }

    if (path === '/manager/offers/search-limit' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(res, 200, await handleSearchLimitSave(form.searchLimit ?? ''));
      return;
    }

    if (path === '/manager/offers/affiliate-delay' && method === 'POST') {
      const body = await readFormBody(req);
      const form = parseFormUrlEncoded(body);
      sendHtml(
        res,
        200,
        await handleAffiliateDelaySave(
          form.affiliateDelayMs ?? '',
          form.affiliateBacklogDelayMinutes ?? '',
          form.affiliateBacklogThreshold ?? '',
        ),
      );
      return;
    }

    if (path === '/manager/offers/delete-pending' && method === 'POST') {
      const result = await handleDeleteAllPending();
      if ('error' in result) {
        sendHtml(res, 200, await showOffersList(new URLSearchParams({ status: 'pending', error: result.error })));
        return;
      }
      sendRedirect(res, `/manager/offers?status=pending&cleared=${result.count}`);
      return;
    }

    if (path === '/manager/offers/collect' && method === 'POST') {
      const result = await handleCollectOffers();
      if ('error' in result) {
        sendRedirect(res, `/manager?collectError=${encodeURIComponent(result.error)}`);
        return;
      }
      sendRedirect(res, '/manager?collectQueued=1');
      return;
    }

    const deleteOfferMatch = path.match(/^\/manager\/offers\/([^/]+)\/delete$/);
    if (deleteOfferMatch && method === 'POST') {
      const result = await handleDeleteOffer(decodeURIComponent(deleteOfferMatch[1]!));
      // Volta para a página de origem (dashboard ou lista de ofertas).
      const referer = req.headers.referer ?? '';
      const fromDashboard = /\/manager(?:\?|$)/.test(referer);
      if ('error' in result) {
        if (fromDashboard) {
          sendRedirect(res, `/manager?deleteError=${encodeURIComponent(result.error)}`);
        } else {
          sendHtml(res, 200, await showOffersList(new URLSearchParams({ status: 'pending', error: result.error })));
        }
        return;
      }
      sendRedirect(res, fromDashboard ? '/manager?deleted=1' : '/manager/offers?status=pending&cleared=1');
      return;
    }

    const sendNowMatch = path.match(/^\/manager\/offers\/([^/]+)\/send-now$/);
    if (sendNowMatch && method === 'POST') {
      const result = await handleSendOfferNow(sendNowMatch[1]!);
      if ('error' in result) {
        sendRedirect(res, `/manager?sendError=${encodeURIComponent(result.error)}`);
        return;
      }
      sendRedirect(res, '/manager?sentNow=1');
      return;
    }

    if (path === '/manager/template' && method === 'POST') {

      const body = await readFormBody(req);

      const form = parseFormUrlEncoded(body);

      sendHtml(res, 200, await handleTemplateSave(form));

      return;

    }

    if (path === '/manager/template/coupon' && method === 'POST') {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleCouponTemplateSave(form));
      return;
    }

    if (path === '/manager/template/auto-message' && method === 'POST') {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleAutoMessageCreate(form));
      return;
    }

    const autoMessageUpdateMatch = path.match(/^\/manager\/template\/auto-message\/([^/]+)$/);
    if (autoMessageUpdateMatch && method === 'POST') {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleAutoMessageUpdate(autoMessageUpdateMatch[1]!, form));
      return;
    }

    const autoMessageDeleteMatch = path.match(/^\/manager\/template\/auto-message\/([^/]+)\/delete$/);
    if (autoMessageDeleteMatch && method === 'POST') {
      sendHtml(res, 200, await handleAutoMessageDelete(autoMessageDeleteMatch[1]!));
      return;
    }

    const autoMessageSendMatch = path.match(/^\/manager\/template\/auto-message\/([^/]+)\/send$/);
    if (autoMessageSendMatch && method === 'POST') {
      sendHtml(res, 200, await handleAutoMessageSendNow(autoMessageSendMatch[1]!));
      return;
    }



    if (method !== 'GET') {

      sendText(res, 405, 'Method Not Allowed');

      return;

    }



    if (path === '/manager') {

      sendHtml(
        res,
        200,
        await showDashboard({
          sendNowMessage: url.searchParams.get('sentNow') === '1'
            ? 'Envio imediato enfileirado — deve publicar em instantes.'
            : url.searchParams.get('deleted') === '1'
              ? 'Oferta removida com sucesso.'
              : undefined,
          sendNowError: url.searchParams.get('sendError') ?? url.searchParams.get('deleteError') ?? undefined,
          collectMessage: url.searchParams.get('collectQueued') === '1' ? 'Busca de novos anúncios enfileirada.' : undefined,
          collectError: url.searchParams.get('collectError') ?? undefined,
        }),
      );

      return;

    }



    if (path === '/manager/offers') {

      sendHtml(res, 200, await showOffersList(url.searchParams));

      return;

    }



    const detailMatch = path.match(/^\/manager\/offers\/([^/]+)$/);

    if (detailMatch) {

      const result = await showOfferDetail(detailMatch[1]!);

      sendHtml(res, result.status, result.html);

      return;

    }



    if (path === '/manager/health') {

      sendText(res, 200, 'ok');

      return;

    }



    sendHtml(res, 404, '<!DOCTYPE html><html><body><h1>404</h1><p><a href="/manager">Manager</a></p></body></html>');

  } catch (error) {

    logger.error({ error, path }, 'Manager request failed');

    const message = toManagerErrorMessage(error);
    sendHtml(
      res,
      500,
      renderLayout(
        'Erro',
        `<p class="alert err">${escapeHtml(message)}</p><p class="meta"><a href="/manager">Voltar ao painel</a></p>`,
      ),
    );

  }

}



export async function shutdownManager(): Promise<void> {
  await closeLogStore();
  await prisma.$disconnect();
}

