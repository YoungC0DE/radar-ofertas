import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

import { prisma } from '../../src/database/client.js';
import { env } from '../../src/config/env.js';
import { closeAllQueues } from '../../src/queue/index.js';
import { closeLogStore } from '../../src/utils/log-store.js';
import { closeRedisState } from '../../src/utils/redis-state.js';
import { logger } from '../../src/utils/logger.js';
import { toManagerErrorMessage } from '../views/error-message.js';
import { escapeHtml } from '../views/helpers.js';
import { renderLayout } from '../views/layout.js';
import { serveStaticAsset } from './static.js';

export type HttpMethod = 'GET' | 'POST';

export interface RouteContext {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  path: string;
  params: Record<string, string>;
}

export type RouteHandler = (ctx: RouteContext) => Promise<void>;

export interface RouteDefinition {
  method: HttpMethod;
  pattern: string;
  handler: RouteHandler;
}

export function sendHtml(res: ServerResponse, status: number, html: string): void {
  res.writeHead(status, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

export function sendRedirect(res: ServerResponse, location: string): void {
  res.writeHead(303, { Location: location });
  res.end();
}

export function sendText(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

export function sendJson(res: ServerResponse, status: number, body: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

export function isAuthorized(req: IncomingMessage, url: URL): boolean {
  const token = env.MANAGER_TOKEN;
  if (!token) return true;

  const queryToken = url.searchParams.get('token');
  if (queryToken === token) return true;

  const auth = req.headers.authorization;
  if (auth === `Bearer ${token}`) return true;

  return false;
}

export function normalizePath(pathname: string): string {
  if (pathname.endsWith('/') && pathname.length > 1) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

export async function readFormBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export function parseFormUrlEncoded(body: string): Record<string, string> {
  const params = new URLSearchParams(body);
  const result: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    result[key] = value;
  }
  return result;
}

function compilePattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];
  const regexSource = pattern
    .split('/')
    .map((segment) => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');

  return { regex: new RegExp(`^${regexSource}$`), paramNames };
}

function matchRoute(path: string, route: RouteDefinition): Record<string, string> | null {
  const { regex, paramNames } = compilePattern(route.pattern);
  const match = path.match(regex);
  if (!match) return null;

  const params: Record<string, string> = {};
  paramNames.forEach((name, index) => {
    params[name] = decodeURIComponent(match[index + 1] ?? '');
  });
  return params;
}

export function createRouter(routes: RouteDefinition[]) {
  return async function handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const host = req.headers.host ?? 'localhost';
    const url = new URL(req.url ?? '/', `http://${host}`);

    if (!isAuthorized(req, url)) {
      sendText(res, 401, 'Unauthorized — defina MANAGER_TOKEN ou use ?token=');
      return;
    }

    const path = normalizePath(url.pathname);
    const method = (req.method ?? 'GET').toUpperCase() as HttpMethod;

    if (method === 'GET' && path.startsWith('/manager/assets/')) {
      const assetPath = path.slice('/manager/assets/'.length);
      const served = await serveStaticAsset(assetPath, res);
      if (served) return;
      sendText(res, 404, 'Not found');
      return;
    }

    try {
      for (const route of routes) {
        if (route.method !== method) continue;
        const params = matchRoute(path, route);
        if (!params) continue;

        await route.handler({ req, res, url, path, params });
        return;
      }

      if (method !== 'GET') {
        sendText(res, 405, 'Method Not Allowed');
        return;
      }

      sendHtml(
        res,
        404,
        '<!DOCTYPE html><html><body><h1>404</h1><p><a href="/manager">Manager</a></p></body></html>',
      );
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
  };
}

export async function shutdownManager(): Promise<void> {
  await closeAllQueues();
  await closeLogStore();
  await closeRedisState();
  await prisma.$disconnect();
}
