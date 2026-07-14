import type { IncomingMessage, ServerResponse } from 'node:http';

import { env } from '../../src/config/env.js';

import { prisma } from '../../src/database/client.js';
import { closeLogStore } from '../../src/utils/log-store.js';

import { logger } from '../../src/utils/logger.js';

import { handleCollectOffers, showDashboard } from '../controllers/dashboard-controller.js';

import { showOfferDetail, showOffersList, handleDeleteAllPending, handleAffiliateDelaySave, handleSendOfferNow, handleSearchLimitSave } from '../controllers/offers-controller.js';

import { handleTemplateSave, showTemplatePage } from '../controllers/template-controller.js';
import { handleChannelLinkSave, handleBrandSave, handleOperatingHoursSave, handleScoreSave, handleSendIntervalSave, handleSenderDelaySave, showSettingsPage } from '../controllers/settings-controller.js';
import { getLogsJson, showLogsPage } from '../controllers/logs-controller.js';
import {
  cancelMercadoLivreConnectJson,
  finishMercadoLivreConnectJson,
  getMercadoLivreConnectJson,
  getWhatsAppConnectJson,
  startMercadoLivreConnectJson,
  startWhatsAppConnectJson,
} from '../controllers/connection-controller.js';
import {
  getPrismaJson,
  getWorkerJson,
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

    if (path === '/manager/logs' && method === 'GET') {
      sendHtml(res, 200, await showLogsPage(url.searchParams));
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

    if (path === '/manager/settings/worker/start' && method === 'POST') {
      sendJson(res, 200, startWorkerJson());
      return;
    }

    if (path === '/manager/settings/worker/restart' && method === 'POST') {
      sendJson(res, 200, await restartWorkerJson());
      return;
    }

    if (path === '/manager/settings/worker/stop' && method === 'POST') {
      sendJson(res, 200, await stopWorkerJson());
      return;
    }

    if (path === '/manager/settings/worker/status' && method === 'GET') {
      sendJson(res, 200, getWorkerJson());
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



    if (method !== 'GET') {

      sendText(res, 405, 'Method Not Allowed');

      return;

    }



    if (path === '/manager') {

      sendHtml(
        res,
        200,
        await showDashboard({
          sendNowMessage: url.searchParams.get('sentNow') === '1' ? 'Envio imediato enfileirado — deve publicar em instantes.' : undefined,
          sendNowError: url.searchParams.get('sendError') ?? undefined,
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

    sendText(res, 500, 'Internal Server Error');

  }

}



export async function shutdownManager(): Promise<void> {
  await closeLogStore();
  await prisma.$disconnect();
}

