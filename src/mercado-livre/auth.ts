import readline from "node:readline";
import { stdin, stdout } from "node:process";
import { chromium, type Page } from "playwright";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import {
  ensureAuthDir,
  saveStorageState,
  updateSessionMeta,
} from "./session.js";

const AFFILIATE_LOGIN_URL =
  "https://www.mercadolivre.com.br/afiliados/linkbuilder#hub";
const LOGIN_PAGE_PATTERN =
  /login|registration|account-verification|jms\/mlb\/lgz/i;

async function waitForEnter(prompt: string): Promise<void> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  await new Promise<void>((resolve) => {
    rl.question(prompt, () => {
      rl.close();
      resolve();
    });
  });
}

async function isAffiliatePortalReady(page: Page): Promise<boolean> {
  const url = page.url();
  if (LOGIN_PAGE_PATTERN.test(url)) return false;

  const hasLinkBuilder = await page
    .locator(
      'input[type="url"], input[placeholder*="URL"], input[placeholder*="url"], textarea, input[data-testid*="url"]',
    )
    .first()
    .isVisible()
    .catch(() => false);

  return (
    hasLinkBuilder ||
    /afiliados\/link-builder|afiliados-home|affiliate-program/i.test(url)
  );
}

export async function loginAffiliateSession(): Promise<void> {
  await ensureAuthDir();

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: env.ML_SCRAPER_USER_AGENT,
    locale: "pt-BR",
  });
  const page = await context.newPage();

  try {
    logger.info(
      "Abrindo portal de afiliados — faça login manualmente no navegador",
    );
    await page.goto(AFFILIATE_LOGIN_URL, {
      waitUntil: "domcontentloaded",
      timeout: env.ML_HTTP_TIMEOUT_MS,
    });

    logger.info(
      "O navegador permanecerá aberto até você confirmar. " +
        "Conclua o login e acesse o Gerador de Links antes de continuar.",
    );

    while (true) {
      await waitForEnter(
        "\nQuando estiver logado no portal de afiliados, pressione Enter para salvar a sessão... ",
      );

      if (await isAffiliatePortalReady(page)) break;

      logger.warn(
        { url: page.url() },
        "Login ainda não detectado — complete o login no navegador e pressione Enter novamente",
      );
    }

    const storageState = await context.storageState();
    await saveStorageState(storageState);
    await updateSessionMeta({
      lastLoginAt: new Date().toISOString(),
      lastError: null,
    });

    logger.info(
      { path: env.ML_AUTH_PATH },
      "Sessão de afiliado salva com sucesso",
    );
  } finally {
    await browser.close();
  }
}
