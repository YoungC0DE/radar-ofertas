import { chromium, type BrowserContextOptions } from 'playwright';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { collectCouponsFromUnknown, isLoginHtml, parseCouponsHtml, parseCouponsJson } from './coupon-parser.js';
import {
  cookiesToHeader,
  hasValidSession,
  loadStorageState,
} from './session.js';
import type { CouponScrapeResult, MlCoupon } from './types.js';

const DEFAULT_HEADERS = {
  Accept: 'text/html,application/xhtml+xml,application/json',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
};

function couponsPageUrl(): string {
  return env.ML_COUPONS_URL.split('#')[0] ?? env.ML_COUPONS_URL;
}

function dedupeCoupons(coupons: MlCoupon[]): MlCoupon[] {
  const seen = new Set<string>();
  return coupons.filter((coupon) => {
    const key = `${coupon.id}|${coupon.title}|${coupon.code ?? ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchCouponsViaHttp(): Promise<MlCoupon[] | null> {
  const state = await loadStorageState();
  if (!state || !hasValidSession(state)) return null;

  const url = couponsPageUrl();
  const cookieHeader = cookiesToHeader(state.cookies, ['mercadolivre.com.br', 'mercadolibre.com']);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.ML_HTTP_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        ...DEFAULT_HEADERS,
        'User-Agent': env.ML_SCRAPER_USER_AGENT,
        Cookie: cookieHeader,
        Referer: 'https://www.mercadolivre.com.br/afiliados/',
      },
      signal: controller.signal,
      redirect: 'follow',
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      const data = (await response.json()) as unknown;
      const coupons = parseCouponsJson(data);
      return coupons.length > 0 ? coupons : null;
    }

    const html = await response.text();
    if (!response.ok || isLoginHtml(html)) return null;

    const coupons = parseCouponsHtml(html);
    return coupons.length > 0 ? coupons : null;
  } catch (error) {
    logger.debug({ error, url }, 'ML coupons HTTP fetch failed');
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCouponsViaBrowser(): Promise<MlCoupon[]> {
  const state = await loadStorageState();
  const url = env.ML_COUPONS_URL;
  const collected: MlCoupon[] = [];

  const browser = await chromium.launch({ headless: env.ML_BROWSER_HEADLESS });

  try {
    const context = await browser.newContext({
      userAgent: env.ML_SCRAPER_USER_AGENT,
      locale: 'pt-BR',
      storageState: state ? (state as BrowserContextOptions['storageState']) : undefined,
    });
    const page = await context.newPage();

    page.on('response', async (response) => {
      const responseUrl = response.url();
      if (!/coupon|cupom|affiliate|campaign|benefit|promo/i.test(responseUrl)) return;
      if (response.status() < 200 || response.status() >= 300) return;

      const contentType = response.headers()['content-type'] ?? '';
      if (!contentType.includes('json')) return;

      try {
        const data = (await response.json()) as unknown;
        const before = collected.length;
        collectCouponsFromUnknown(data, collected);
        if (collected.length > before) {
          logger.debug({ responseUrl, added: collected.length - before }, 'Coupons captured from API response');
        }
      } catch {
        // resposta não-JSON
      }
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: env.ML_HTTP_TIMEOUT_MS });
    await page.waitForTimeout(3000);

    try {
      await page.waitForSelector('[class*="coupon"], [data-testid*="coupon"], [class*="cupom"], article', {
        timeout: 8000,
      });
    } catch {
      // página pode não ter seletores conhecidos
    }

    const html = await page.content();
    if (isLoginHtml(html) && collected.length === 0) {
      throw new Error('Sessão de afiliado necessária — conecte o Mercado Livre em Configuração.');
    }

    collected.push(...parseCouponsHtml(html));

    const embeddedState = await page.evaluate(() => {
      const globals = window as unknown as Record<string, unknown>;
      return globals.__PRELOADED_STATE__ ?? globals.__NORDIC_STATE__ ?? null;
    });

    if (embeddedState) {
      collectCouponsFromUnknown(embeddedState, collected);
    }

    return dedupeCoupons(collected);
  } finally {
    await browser.close();
  }
}

export async function scrapeAffiliateCoupons(): Promise<CouponScrapeResult> {
  const state = await loadStorageState();
  const sessionRequired = !hasValidSession(state);

  const httpCoupons = await fetchCouponsViaHttp();
  if (httpCoupons && httpCoupons.length > 0) {
    return {
      coupons: httpCoupons,
      source: 'http',
      scrapedAt: new Date().toISOString(),
      sessionRequired: false,
    };
  }

  if (!env.ML_USE_BROWSER_FALLBACK) {
    if (sessionRequired) {
      throw new Error('Sessão de afiliado necessária — conecte o Mercado Livre em Configuração.');
    }
    throw new Error('Nenhum cupom encontrado via HTTP. Ative ML_USE_BROWSER_FALLBACK=true no .env.');
  }

  const browserCoupons = await fetchCouponsViaBrowser();
  if (browserCoupons.length === 0) {
    throw new Error('Nenhum cupom encontrado. Verifique a sessão de afiliado e a URL ML_COUPONS_URL no .env.');
  }

  return {
    coupons: browserCoupons,
    source: 'browser',
    scrapedAt: new Date().toISOString(),
    sessionRequired,
  };
}
