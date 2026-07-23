import type { RouteDefinition } from '../request.js';
import {
  parseFormUrlEncoded,
  readFormBody,
  sendHtml,
  sendJson,
  sendRedirect,
  sendText,
} from '../request.js';
import { handleCollectOffers, showDashboard } from '../../controllers/dashboard-controller.js';
import {
  handleAffiliateDelaySave,
  handleDeleteAllPending,
  handleDeleteOffer,
  handleSearchLimitSave,
  handleSendOfferNow,
  showOfferDetail,
  showOffersList,
} from '../../controllers/offers-controller.js';
import {
  handleAutoMessageCreate,
  handleAutoMessageDelete,
  handleAutoMessageSendNow,
  handleAutoMessageUpdate,
  handleCouponTemplateSave,
  handleTemplateSave,
  showTemplatePage,
} from '../../controllers/template-controller.js';
import {
  handleBrandSave,
  handleChannelLinkSave,
  handleCouponsUrlSave,
  handleOperatingHoursSave,
  handleScoreSave,
  handleSendIntervalSave,
  handleSenderDelaySave,
  handleWhatsAppDestinationAdd,
  handleWhatsAppDestinationRemove,
  handleWhatsAppDestinationToggle,
  showSettingsPage,
} from '../../controllers/settings-controller.js';
import { getLogsJson, showLogsPage } from '../../controllers/logs-controller.js';
import {
  getCouponsApiJson,
  handleCouponSend,
  handleCouponStoreLinkSave,
  handleCouponsRefresh,
  showCouponsPage,
} from '../../controllers/coupons-controller.js';
import {
  handleSourceAdd,
  handleSourceFlagsSave,
  handleSourceRemove,
  parseSourcesChannel,
  showSourcesPage,
} from '../../controllers/sources-controller.js';
import {
  cancelMercadoLivreConnectJson,
  finishMercadoLivreConnectJson,
  getMercadoLivreConnectJson,
  getTelegramConnectJson,
  getWhatsAppConnectJson,
  startMercadoLivreConnectJson,
  startWhatsAppConnectJson,
} from '../../controllers/connection-controller.js';
import {
  getPrismaJson,
  getWorkerJson,
  parseAccountIdParam,
  parseChannelParam,
  restartWorkerJson,
  runPrismaGenerateJson,
  startWorkerJson,
  stopWorkerJson,
} from '../../controllers/process-controller.js';
import {
  handleAccountAdd,
  handleAccountDelete,
  handleAccountToggle,
  showAccountsPage,
} from '../../controllers/accounts-controller.js';
import { getMetrics } from '../../../src/utils/metrics.js';

export const dashboardRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager',
    handler: async ({ res, url }) => {
      sendHtml(
        res,
        200,
        await showDashboard({
          sendNowMessage:
            url.searchParams.get('sentNow') === '1'
              ? 'Envio imediato enfileirado — deve publicar em instantes.'
              : url.searchParams.get('deleted') === '1'
                ? 'Oferta removida com sucesso.'
                : undefined,
          sendNowError:
            url.searchParams.get('sendError') ?? url.searchParams.get('deleteError') ?? undefined,
          collectMessage:
            url.searchParams.get('collectQueued') === '1'
              ? 'Busca de novos anúncios enfileirada.'
              : undefined,
          collectError: url.searchParams.get('collectError') ?? undefined,
        }),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/offers/collect',
    handler: async ({ res }) => {
      const result = await handleCollectOffers();
      if ('error' in result) {
        sendRedirect(res, `/manager?collectError=${encodeURIComponent(result.error)}`);
        return;
      }
      sendRedirect(res, '/manager?collectQueued=1');
    },
  },
  {
    method: 'GET',
    pattern: '/manager/health',
    handler: async ({ res }) => {
      sendText(res, 200, 'ok');
    },
  },
  {
    method: 'GET',
    pattern: '/manager/api/metrics',
    handler: async ({ res }) => sendJson(res, 200, JSON.stringify(await getMetrics())),
  },
];

export const offersRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/offers',
    handler: async ({ res, url }) => sendHtml(res, 200, await showOffersList(url.searchParams)),
  },
  {
    method: 'GET',
    pattern: '/manager/offers/:offerId',
    handler: async ({ res, params }) => {
      const result = await showOfferDetail(params.offerId);
      sendHtml(res, result.status, result.html);
    },
  },
  {
    method: 'POST',
    pattern: '/manager/offers/search-limit',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSearchLimitSave(form.searchLimit ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/offers/affiliate-delay',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(
        res,
        200,
        await handleAffiliateDelaySave(
          form.affiliateDelayMs ?? '',
          form.affiliateBacklogDelayMinutes ?? '',
          form.affiliateBacklogThreshold ?? '',
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/offers/delete-pending',
    handler: async ({ res }) => {
      const result = await handleDeleteAllPending();
      if ('error' in result) {
        sendHtml(
          res,
          200,
          await showOffersList(new URLSearchParams({ status: 'pending', error: result.error })),
        );
        return;
      }
      sendRedirect(res, `/manager/offers?status=pending&cleared=${result.count}`);
    },
  },
  {
    method: 'POST',
    pattern: '/manager/offers/:offerId/delete',
    handler: async ({ req, res, params }) => {
      const result = await handleDeleteOffer(params.offerId);
      const referer = req.headers.referer ?? '';
      const fromDashboard = /\/manager(?:\?|$)/.test(referer);
      if ('error' in result) {
        if (fromDashboard) {
          sendRedirect(res, `/manager?deleteError=${encodeURIComponent(result.error)}`);
        } else {
          sendHtml(
            res,
            200,
            await showOffersList(new URLSearchParams({ status: 'pending', error: result.error })),
          );
        }
        return;
      }
      sendRedirect(
        res,
        fromDashboard ? '/manager?deleted=1' : '/manager/offers?status=pending&cleared=1',
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/offers/:offerId/send-now',
    handler: async ({ res, params }) => {
      const result = await handleSendOfferNow(params.offerId);
      if ('error' in result) {
        sendRedirect(res, `/manager?sendError=${encodeURIComponent(result.error)}`);
        return;
      }
      sendRedirect(res, '/manager?sentNow=1');
    },
  },
];

export const settingsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/settings',
    handler: async ({ res }) => sendHtml(res, 200, await showSettingsPage()),
  },
  {
    method: 'POST',
    pattern: '/manager/settings/send-interval',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSendIntervalSave(form.intervalMinutes ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/sender-delay',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSenderDelaySave(form.senderDelayMinutes ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/brand',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleBrandSave(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/score',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleScoreSave(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/operating-hours',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleOperatingHoursSave(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/channel-link',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleChannelLinkSave(form.inviteLink ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/whatsapp-destinations/add',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleWhatsAppDestinationAdd(form.inviteInput ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/whatsapp-destinations/remove',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleWhatsAppDestinationRemove(form.destinationId ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/whatsapp-destinations/toggle',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(
        res,
        200,
        await handleWhatsAppDestinationToggle(
          form.destinationId ?? '',
          form.enabled === '1' || form.enabled === 'true',
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/coupons-url',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleCouponsUrlSave(form.couponsUrl ?? ''));
    },
  },
];

export const templateRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/template',
    handler: async ({ res }) => sendHtml(res, 200, await showTemplatePage()),
  },
  {
    method: 'POST',
    pattern: '/manager/template',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleTemplateSave(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/template/coupon',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleCouponTemplateSave(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/template/auto-message',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleAutoMessageCreate(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/template/auto-message/:autoMessageId',
    handler: async ({ req, res, params }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleAutoMessageUpdate(params.autoMessageId, form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/template/auto-message/:autoMessageId/delete',
    handler: async ({ res, params }) => {
      sendHtml(res, 200, await handleAutoMessageDelete(params.autoMessageId));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/template/auto-message/:autoMessageId/send',
    handler: async ({ res, params }) => {
      sendHtml(res, 200, await handleAutoMessageSendNow(params.autoMessageId));
    },
  },
];

export const logsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/logs',
    handler: async ({ res, url }) => sendHtml(res, 200, await showLogsPage(url.searchParams)),
  },
  {
    method: 'GET',
    pattern: '/manager/api/logs',
    handler: async ({ res, url }) => sendJson(res, 200, await getLogsJson(url.searchParams)),
  },
];

export const couponsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/coupons',
    handler: async ({ res }) => sendHtml(res, 200, await showCouponsPage()),
  },
  {
    method: 'POST',
    pattern: '/manager/coupons/refresh',
    handler: async ({ res }) => sendHtml(res, 200, await handleCouponsRefresh()),
  },
  {
    method: 'POST',
    pattern: '/manager/coupons/:couponId/send',
    handler: async ({ req, res, params }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleCouponSend(params.couponId, form.code ?? null));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/coupons/:couponId/store-link',
    handler: async ({ req, res, params }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(
        res,
        200,
        await handleCouponStoreLinkSave(params.couponId, form.storeUrl ?? '', form.code ?? null),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/manager/api/coupons',
    handler: async ({ res }) => {
      sendJson(res, 200, getCouponsApiJson());
    },
  },
];

export const sourcesRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/sources/:channel',
    handler: async ({ res, params }) => {
      const channel = parseSourcesChannel(params.channel);
      sendHtml(res, 200, await showSourcesPage(channel));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/sources/:channel',
    handler: async ({ req, res, params }) => {
      const channel = parseSourcesChannel(params.channel);
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSourceFlagsSave(channel, form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/sources/:channel/add',
    handler: async ({ req, res, params }) => {
      const channel = parseSourcesChannel(params.channel);
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleSourceAdd(channel, form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/sources/:channel/remove/:sourceId',
    handler: async ({ res, params }) => {
      const channel = parseSourcesChannel(params.channel);
      sendHtml(res, 200, await handleSourceRemove(channel, params.sourceId));
    },
  },
];

export const connectionRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/manager/settings/connect/wa/start',
    handler: async ({ res }) => sendJson(res, 200, await startWhatsAppConnectJson()),
  },
  {
    method: 'GET',
    pattern: '/manager/settings/connect/wa/status',
    handler: async ({ res }) => sendJson(res, 200, await getWhatsAppConnectJson()),
  },
  {
    method: 'POST',
    pattern: '/manager/settings/connect/ml/start',
    handler: async ({ res }) => {
      sendJson(res, 200, startMercadoLivreConnectJson());
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/connect/ml/finish',
    handler: async ({ res }) => sendJson(res, 200, await finishMercadoLivreConnectJson()),
  },
  {
    method: 'POST',
    pattern: '/manager/settings/connect/ml/cancel',
    handler: async ({ res }) => sendJson(res, 200, await cancelMercadoLivreConnectJson()),
  },
  {
    method: 'GET',
    pattern: '/manager/settings/connect/ml/status',
    handler: async ({ res }) => {
      sendJson(res, 200, getMercadoLivreConnectJson());
    },
  },
  {
    method: 'GET',
    pattern: '/manager/settings/connect/telegram/status',
    handler: async ({ res }) => sendJson(res, 200, await getTelegramConnectJson()),
  },
];

export const workerRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/manager/settings/worker/start',
    handler: async ({ res, url }) => {
      sendJson(
        res,
        200,
        await startWorkerJson(
          parseChannelParam(url.searchParams.get('channel')),
          parseAccountIdParam(url.searchParams.get('accountId')),
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/worker/restart',
    handler: async ({ res, url }) => {
      sendJson(
        res,
        200,
        await restartWorkerJson(
          parseChannelParam(url.searchParams.get('channel')),
          parseAccountIdParam(url.searchParams.get('accountId')),
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/worker/stop',
    handler: async ({ res, url }) => {
      sendJson(
        res,
        200,
        await stopWorkerJson(
          parseChannelParam(url.searchParams.get('channel')),
          parseAccountIdParam(url.searchParams.get('accountId')),
        ),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/manager/settings/worker/status',
    handler: async ({ res, url }) => {
      sendJson(
        res,
        200,
        await getWorkerJson(
          parseChannelParam(url.searchParams.get('channel')),
          parseAccountIdParam(url.searchParams.get('accountId')),
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/manager/settings/prisma/generate',
    handler: async ({ res }) => {
      sendJson(res, 200, runPrismaGenerateJson());
    },
  },
  {
    method: 'GET',
    pattern: '/manager/settings/prisma/status',
    handler: async ({ res }) => {
      sendJson(res, 200, getPrismaJson());
    },
  },
];

export const accountsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/manager/accounts',
    handler: async ({ res, url }) => {
      const saved = url.searchParams.get('saved') === '1' ? 'Salvo com sucesso' : null;
      const deleted = url.searchParams.get('deleted') === '1' ? 'Conta removida' : null;
      const error = url.searchParams.get('error') ?? null;
      sendHtml(res, 200, await showAccountsPage(saved ?? deleted, error));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/accounts/add',
    handler: async ({ req, res }) => {
      const form = parseFormUrlEncoded(await readFormBody(req));
      sendHtml(res, 200, await handleAccountAdd(form));
    },
  },
  {
    method: 'POST',
    pattern: '/manager/accounts/:accountId/toggle',
    handler: async ({ res, params }) => {
      const result = await handleAccountToggle(params.accountId);
      sendRedirect(res, result.redirect);
    },
  },
  {
    method: 'POST',
    pattern: '/manager/accounts/:accountId/delete',
    handler: async ({ res, params }) => {
      const result = await handleAccountDelete(params.accountId);
      sendRedirect(res, result.redirect);
    },
  },
];

export const managerRoutes: RouteDefinition[] = [
  ...dashboardRoutes,
  ...offersRoutes,
  ...settingsRoutes,
  ...templateRoutes,
  ...logsRoutes,
  ...couponsRoutes,
  ...sourcesRoutes,
  ...accountsRoutes,
  ...connectionRoutes,
  ...workerRoutes,
];
