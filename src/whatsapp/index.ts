import { access, rm } from 'node:fs/promises';
import path from 'node:path';
import makeWASocket, {
  DisconnectReason,
  isJidNewsletter,
  type WASocket,
  type ConnectionUpdateEvent,
  type MessageUpdateEvent,
  type WAMessage,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from 'baileys';
import type { Boom } from '@hapi/boom';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

let socket: WASocket | undefined;
let isConnecting = false;
let allowReconnect = true;
let qrListener: ((qr: string) => void) | undefined;

export interface ConnectWhatsAppOptions {
  onQr?: (qr: string) => void;
}

const PLACEHOLDER_CHANNEL_PATTERN = /1203630{6,}@newsletter$/;

function printQrCode(qr: string): void {
  console.log('\nEscaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):\n');
  qrcode.generate(qr, { small: true });
  console.log('\nSe o QR não aparecer, abra este link no navegador e escaneie a imagem:\n');
  console.log(`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}\n`);
}

export function isPlaceholderChannelId(channelId: string): boolean {
  return PLACEHOLDER_CHANNEL_PATTERN.test(channelId);
}

export function isNewsletterChannelId(channelId: string): boolean {
  return isJidNewsletter(channelId);
}

export async function hasWhatsAppCredentials(): Promise<boolean> {
  try {
    await access(path.join(env.WHATSAPP_AUTH_PATH, 'creds.json'));
    return true;
  } catch {
    return false;
  }
}

export async function clearWhatsAppCredentials(): Promise<void> {
  socket = undefined;
  isConnecting = false;
  qrListener = undefined;
  await rm(env.WHATSAPP_AUTH_PATH, { recursive: true, force: true });
  logger.warn(
    { path: env.WHATSAPP_AUTH_PATH },
    'Credenciais do WhatsApp removidas — escaneie um novo QR para reconectar',
  );
}

function resolveNewsletterName(name: unknown): string | undefined {
  if (typeof name === 'string') return name;
  if (name && typeof name === 'object' && 'text' in name && typeof name.text === 'string') {
    return name.text;
  }
  return undefined;
}

export async function validateWhatsAppChannel(
  sock: WASocket,
  channelId: string,
): Promise<{ valid: boolean; name?: string; reason?: string }> {
  if (!isJidNewsletter(channelId)) {
    return { valid: false, reason: 'WHATSAPP_CHANNEL_ID deve terminar com @newsletter' };
  }

  if (isPlaceholderChannelId(channelId)) {
    return {
      valid: false,
      reason: 'WHATSAPP_CHANNEL_ID parece placeholder — use o ID real do seu canal',
    };
  }

  try {
    const meta = await sock.newsletterMetadata('jid', channelId);
    if (!meta?.id) {
      return { valid: false, reason: 'Canal não encontrado ou sem permissão de admin' };
    }

    return {
      valid: true,
      name:
        resolveNewsletterName(meta.name) ??
        resolveNewsletterName(meta.thread_metadata?.name),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, reason: message };
  }
}

async function createSocket(
  authState: Awaited<ReturnType<typeof useMultiFileAuthState>>['state'],
  saveCreds: () => Promise<void>,
): Promise<WASocket> {
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: {
      creds: authState.creds,
      keys: makeCacheableSignalKeyStore(authState.keys, P({ level: 'silent' })),
    },
    logger: P({ level: env.NODE_ENV === 'production' ? 'warn' : 'silent' }),
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update: ConnectionUpdateEvent) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Aguardando leitura do QR code para autenticar o WhatsApp');
      printQrCode(qr);
      qrListener?.(qr);
    }

    if (connection === 'open') {
      socket = sock;
      isConnecting = false;
      qrListener = undefined;
      logger.info('WhatsApp connected');
    }

    if (connection === 'close') {
      socket = undefined;
      isConnecting = false;

      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        // Sessão morta. Sem apagar as credenciais, o Baileys nunca emite um novo
        // QR (ele insiste no creds.json inválido). Limpamos para permitir re-scan.
        logger.error('WhatsApp logged out — limpando credenciais para permitir novo QR');
        void clearWhatsAppCredentials();
        return;
      }

      if (statusCode === DisconnectReason.connectionReplaced) {
        // Outro socket assumiu a sessão (mesma conta em outro processo).
        // Reconectar só reinicia o ping-pong — então paramos aqui.
        allowReconnect = false;
        logger.error(
          'WhatsApp: outra sessão assumiu a conexão (connectionReplaced) — não vou reconectar. Rode apenas UM processo com WhatsApp por vez.',
        );
        return;
      }

      if (allowReconnect) {
        logger.warn('WhatsApp disconnected, reconnecting in 3s...');
        setTimeout(() => void connectWhatsApp(), 3000);
      }
    }
  });

  sock.ev.on('messages.update', (updates: MessageUpdateEvent[]) => {
    for (const update of updates) {
      logger.debug({ update }, 'Message status updated');
    }
  });

  return sock;
}

export async function connectWhatsApp(options?: ConnectWhatsAppOptions): Promise<WASocket> {
  if (options?.onQr) qrListener = options.onQr;
  if (socket) return socket;

  if (isConnecting) {
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (socket || !isConnecting) {
          clearInterval(interval);
          resolve();
        }
      }, 500);
    });
    if (socket) return socket;
  }

  isConnecting = true;
  allowReconnect = true;
  const { state, saveCreds } = await useMultiFileAuthState(env.WHATSAPP_AUTH_PATH);
  const sock = await createSocket(state, saveCreds);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WhatsApp connection timeout')), 120_000);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }: ConnectionUpdateEvent) => {
      if (connection === 'open') {
        clearTimeout(timeout);
        resolve(sock);
        return;
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
        // Logout with stale creds never yields a QR; fail fast so callers (ex.: o
        // painel) possam limpar e reiniciar em vez de travar 120s no timeout.
        if (statusCode === DisconnectReason.loggedOut) {
          clearTimeout(timeout);
          reject(new Error('WhatsApp logged out — credenciais inválidas, reconecte para novo QR'));
        }
      }
    });
  });
}

export async function disconnectWhatsApp(): Promise<void> {
  allowReconnect = false;
  const sock = socket;
  socket = undefined;
  isConnecting = false;

  if (sock) {
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
    sock.ev.removeAllListeners('messages.update');
    await sock.ws.close();
    logger.info('WhatsApp disconnected');
  }
}

export async function sendOffer(
  sock: WASocket,
  channelId: string,
  imageUrl: string | null,
  caption: string,
): Promise<WAMessage> {
  if (!isJidNewsletter(channelId)) {
    throw new Error('Destino deve ser um canal WhatsApp (@newsletter), não chat pessoal');
  }

  const validation = await validateWhatsAppChannel(sock, channelId);
  if (!validation.valid) {
    throw new Error(`Canal WhatsApp inválido: ${validation.reason}`);
  }

  const channelName = validation.name;

  if (imageUrl) {
    try {
      const response = await fetch(imageUrl, {
        headers: { 'User-Agent': env.ML_SCRAPER_USER_AGENT },
      });
      if (response.ok) {
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const result = await sock.sendMessage(channelId, { image: imageBuffer, caption });
        if (result?.key?.id) {
          logger.info(
            { channelId, channelName, messageId: result.key.id, mode: 'image' },
            'Offer sent to WhatsApp channel',
          );
          return result;
        }
      }
      logger.warn({ imageUrl, status: response.status }, 'Falha ao baixar imagem — enviando só texto');
    } catch (error) {
      logger.warn({ error, imageUrl }, 'Erro no envio com imagem — enviando só texto');
    }
  }

  const result = await sock.sendMessage(channelId, { text: caption });
  if (!result?.key?.id) {
    throw new Error('WhatsApp não confirmou o envio da mensagem');
  }

  logger.info(
    { channelId, channelName, messageId: result.key.id, mode: 'text' },
    'Offer sent to WhatsApp channel',
  );
  return result;
}
