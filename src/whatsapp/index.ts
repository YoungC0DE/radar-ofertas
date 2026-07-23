import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { hostname } from 'node:os';
import path from 'node:path';
import makeWASocket, {
  DisconnectReason,
  areJidsSameUser,
  isJidGroup,
  isJidNewsletter,
  type WASocket,
  type WAMessage,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
} from 'baileys';
import type { Boom } from '@hapi/boom';
import P from 'pino';
import qrcode from 'qrcode-terminal';
import { env } from '../config/env.js';
import { DEFAULT_ACCOUNT_ID } from '../accounts/types.js';
import { logger } from '../utils/logger.js';
import { publishWhatsAppConnectState } from '../utils/redis-state.js';

const LIBSIGNAL_NOISE = [
  'Closing open session in favor of incoming prekey bundle',
  'Closing session:',
];

function suppressLibsignalConsoleNoise(): void {
  const wrap =
    (original: typeof console.warn) =>
    (...args: unknown[]) => {
      const message = typeof args[0] === 'string' ? args[0] : '';
      if (LIBSIGNAL_NOISE.some((noise) => message.includes(noise))) return;
      original(...args);
    };

  console.warn = wrap(console.warn.bind(console));
  console.info = wrap(console.info.bind(console));
}

suppressLibsignalConsoleNoise();

let socket: WASocket | undefined;
let isConnecting = false;
let allowReconnect = true;
let qrListener: ((qr: string) => void) | undefined;

let activeAuthPath = env.WHATSAPP_AUTH_PATH;

/** Auth path da conta ativa neste processo (default: WHATSAPP_AUTH_PATH do .env). */
export function getWhatsAppAuthPath(): string {
  return activeAuthPath;
}

export function setWhatsAppAuthPath(authPath: string): void {
  activeAuthPath = authPath;
}

function activeAccountId(): string {
  return env.WORKER_ACCOUNT_ID || DEFAULT_ACCOUNT_ID;
}

function syncConnectStateToRedis(
  status: 'idle' | 'connecting' | 'qr' | 'connected' | 'error',
  qr: string | null = null,
  error: string | null = null,
): void {
  void publishWhatsAppConnectState(activeAccountId(), { status, qr, error });
}

// --- Dono único da sessão (lock entre processos) -----------------------------
// Só um processo pode manter o socket do WhatsApp aberto ao mesmo tempo; dois
// sockets com as mesmas credenciais causam connectionReplaced em loop (ping-pong).
// Como processos não compartilham memória, coordenamos via um arquivo de lock com
// heartbeat na pasta de auth: quem está conectado renova o lock; quem for tentar
// conectar e encontrar um lock recente de OUTRO processo apenas se recolhe e
// reporta que já está logado em outro lugar, sem brigar pela sessão.
const OWNER_LOCK_STALE_MS = 30_000;
const OWNER_HEARTBEAT_MS = 10_000;
let ownerHeartbeatTimer: NodeJS.Timeout | undefined;

// Chamado quando detectamos que outro processo já é dono da sessão (no login) ou
// quando perdemos a sessão para outro processo (connectionReplaced). O worker
// registra aqui um handler que encerra o processo — assim, se já existe um dono,
// o processo duplicado que estava tentando conectar simplesmente morre. O painel
// não registra nada (não deve morrer nem virar dono).
let onOwnerConflict: (() => void) | undefined;

/** Registra o que fazer quando a sessão já pertence a outro processo. */
export function setWhatsAppOwnerConflictHandler(handler: () => void): void {
  onOwnerConflict = handler;
}

/** Lançado quando a sessão já está ativa em outro processo. */
export class WhatsAppOwnedElsewhereError extends Error {
  constructor() {
    super('A sessão do WhatsApp já está ativa em outro processo.');
    this.name = 'WhatsAppOwnedElsewhereError';
  }
}

interface OwnerLock {
  pid: number;
  host: string;
  heartbeat: string;
}

function ownerLockPathFor(authPath: string): string {
  return path.join(authPath, 'owner.lock');
}

function ownerLockPath(): string {
  return ownerLockPathFor(getWhatsAppAuthPath());
}

async function readOwnerLockAt(authPath: string): Promise<OwnerLock | null> {
  try {
    const parsed = JSON.parse(await readFile(ownerLockPathFor(authPath), 'utf8')) as OwnerLock;
    if (typeof parsed?.pid === 'number' && typeof parsed?.heartbeat === 'string') return parsed;
    return null;
  } catch {
    return null;
  }
}

async function readOwnerLock(): Promise<OwnerLock | null> {
  return readOwnerLockAt(getWhatsAppAuthPath());
}

function isOwnLock(lock: OwnerLock): boolean {
  return lock.pid === process.pid && lock.host === hostname();
}

function isLockFresh(lock: OwnerLock): boolean {
  const age = Date.now() - new Date(lock.heartbeat).getTime();
  return Number.isFinite(age) && age >= 0 && age < OWNER_LOCK_STALE_MS;
}

/** O processo com esse PID (no mesmo host) ainda está rodando? */
function isPidRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // ESRCH = não existe; EPERM = existe mas sem permissão (consideramos vivo).
    return (err as NodeJS.ErrnoException).code === 'EPERM';
  }
}

/**
 * Existe um lock de OUTRO processo que ainda está vivo? Além do heartbeat, no
 * mesmo host confirmamos que o PID existe — assim um lock órfão de um worker
 * morto à força (ex.: restart do painel via taskkill, ou tsx watch) não bloqueia
 * o novo worker.
 */
async function anotherOwnerAlive(): Promise<boolean> {
  const owner = await getWhatsAppOwnerStatus();
  return owner.active && !owner.isCurrentProcess;
}

export interface WhatsAppOwnerStatus {
  active: boolean;
  pid: number | null;
  host: string | null;
  isCurrentProcess: boolean;
}

/** Estado do dono da sessão WhatsApp em um auth path (multi-conta no painel). */
export async function getWhatsAppOwnerStatusAtPath(authPath: string): Promise<WhatsAppOwnerStatus> {
  const lock = await readOwnerLockAt(authPath);
  if (!lock || !isLockFresh(lock)) {
    return { active: false, pid: null, host: null, isCurrentProcess: false };
  }
  if (lock.host === hostname() && !isPidRunning(lock.pid)) {
    return { active: false, pid: lock.pid, host: lock.host, isCurrentProcess: false };
  }
  return {
    active: true,
    pid: lock.pid,
    host: lock.host,
    isCurrentProcess: isOwnLock(lock),
  };
}

/** Estado do dono da sessão WhatsApp (lock + PID vivo no mesmo host). */
export async function getWhatsAppOwnerStatus(): Promise<WhatsAppOwnerStatus> {
  return getWhatsAppOwnerStatusAtPath(getWhatsAppAuthPath());
}

async function writeOwnerLock(): Promise<void> {
  const payload: OwnerLock = {
    pid: process.pid,
    host: hostname(),
    heartbeat: new Date().toISOString(),
  };
  await mkdir(getWhatsAppAuthPath(), { recursive: true }).catch(() => {});
  await writeFile(ownerLockPath(), JSON.stringify(payload)).catch(() => {});
}

function startOwnerHeartbeat(): void {
  if (ownerHeartbeatTimer) return;
  ownerHeartbeatTimer = setInterval(() => {
    if (socket) void writeOwnerLock();
  }, OWNER_HEARTBEAT_MS);
  ownerHeartbeatTimer.unref?.();
}

function stopOwnerHeartbeat(): void {
  if (ownerHeartbeatTimer) {
    clearInterval(ownerHeartbeatTimer);
    ownerHeartbeatTimer = undefined;
  }
}

async function releaseOwnerLock(): Promise<void> {
  stopOwnerHeartbeat();
  const lock = await readOwnerLock();
  if (lock && isOwnLock(lock)) {
    await rm(ownerLockPath(), { force: true }).catch(() => {});
  }
}

export interface ConnectWhatsAppOptions {
  onQr?: (qr: string) => void;
}

const PLACEHOLDER_CHANNEL_PATTERN = /1203630{6,}@newsletter$/;

function printQrCode(qr: string): void {
  console.log('\nEscaneie o QR code abaixo com o WhatsApp (Aparelhos conectados):\n');
  qrcode.generate(qr, { small: true });
  console.log('\nSe o QR não aparecer, abra este link no navegador e escaneie a imagem:\n');
  console.log(
    `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}\n`,
  );
}

export function isPlaceholderChannelId(channelId: string): boolean {
  return PLACEHOLDER_CHANNEL_PATTERN.test(channelId);
}

export function isNewsletterChannelId(channelId: string): boolean {
  return isJidNewsletter(channelId) === true;
}

export async function hasWhatsAppCredentials(): Promise<boolean> {
  try {
    await access(path.join(getWhatsAppAuthPath(), 'creds.json'));
    return true;
  } catch {
    return false;
  }
}

export async function clearWhatsAppCredentials(): Promise<void> {
  socket = undefined;
  isConnecting = false;
  qrListener = undefined;
  await rm(getWhatsAppAuthPath(), { recursive: true, force: true });
  logger.warn(
    { path: getWhatsAppAuthPath() },
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

function collectJids(...ids: Array<string | null | undefined>): string[] {
  return ids.filter((id): id is string => !!id?.trim());
}

function isSameWhatsAppUser(left: string, right: string): boolean {
  return areJidsSameUser(left, right);
}

async function isCurrentUserInGroup(
  sock: WASocket,
  meta: Awaited<ReturnType<WASocket['groupMetadata']>>,
): Promise<boolean> {
  const me = sock.user;
  if (!me) return false;

  const mine = collectJids(me.id, me.lid, me.phoneNumber);
  return (meta.participants ?? []).some((participant) => {
    const theirs = collectJids(participant.id, participant.lid, participant.phoneNumber);
    return theirs.some((participantId) =>
      mine.some((myId) => isSameWhatsAppUser(participantId, myId)),
    );
  });
}

export async function validateWhatsAppGroup(
  sock: WASocket,
  groupJid: string,
  inviteLink?: string | null,
): Promise<{ valid: boolean; name?: string; reason?: string }> {
  if (!isJidGroup(groupJid)) {
    return { valid: false, reason: 'ID do grupo deve terminar com @g.us' };
  }

  try {
    const participating = await sock.groupFetchAllParticipating();
    const fromList = participating[groupJid];
    if (fromList) {
      return { valid: true, name: fromList.subject };
    }

    let meta = await sock.groupMetadata(groupJid);
    if (!meta?.id) {
      return { valid: false, reason: 'Grupo não encontrado' };
    }

    if (!(await isCurrentUserInGroup(sock, meta)) && inviteLink?.trim()) {
      const { joinWhatsAppGroupFromInvite } = await import('./invite.js');
      await joinWhatsAppGroupFromInvite(sock, inviteLink);
      meta = await sock.groupMetadata(groupJid);
    }

    if (await isCurrentUserInGroup(sock, meta)) {
      return { valid: true, name: meta.subject };
    }

    return {
      valid: false,
      reason:
        'O número conectado não participa deste grupo — entre pelo link no celular ou use Pausar no destino',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { valid: false, reason: message };
  }
}

export async function validateWhatsAppDestination(
  sock: WASocket,
  destinationJid: string,
  options?: { inviteLink?: string | null },
): Promise<{ valid: boolean; name?: string; reason?: string }> {
  if (isJidNewsletter(destinationJid)) {
    return validateWhatsAppChannel(sock, destinationJid);
  }

  if (isJidGroup(destinationJid)) {
    return validateWhatsAppGroup(sock, destinationJid, options?.inviteLink);
  }

  return {
    valid: false,
    reason: 'Destino deve ser canal (@newsletter) ou grupo (@g.us)',
  };
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
      name: resolveNewsletterName(meta.name) ?? resolveNewsletterName(meta.thread_metadata?.name),
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

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info('Aguardando leitura do QR code para autenticar o WhatsApp');
      printQrCode(qr);
      qrListener?.(qr);
      syncConnectStateToRedis('qr', qr);
    }

    if (connection === 'open') {
      socket = sock;
      isConnecting = false;
      qrListener = undefined;
      void writeOwnerLock();
      startOwnerHeartbeat();
      syncConnectStateToRedis('connected');
      logger.info('WhatsApp connected');
    }

    if (connection === 'close') {
      socket = undefined;
      isConnecting = false;
      stopOwnerHeartbeat();

      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        // Sessão morta. Sem apagar as credenciais, o Baileys nunca emite um novo
        // QR (ele insiste no creds.json inválido). Limpamos para permitir re-scan.
        logger.error('WhatsApp logged out — limpando credenciais para permitir novo QR');
        syncConnectStateToRedis('error', null, 'Sessão encerrada — escaneie um novo QR');
        void releaseOwnerLock();
        void clearWhatsAppCredentials();
        return;
      }

      if (statusCode === DisconnectReason.connectionReplaced) {
        // Outra sessão (outro processo) assumiu a conexão. NÃO reconectamos —
        // isso só reiniciaria o ping-pong. Avisamos o handler de conflito: no
        // worker isso encerra este processo (não deve haver dois donos).
        allowReconnect = false;
        logger.warn(
          'WhatsApp: a sessão foi assumida por outro processo. Rode apenas UM processo com WhatsApp por vez.',
        );
        onOwnerConflict?.();
        return;
      }

      if (allowReconnect) {
        logger.warn('WhatsApp disconnected, reconnecting in 3s...');
        setTimeout(() => void connectWhatsApp().catch(() => {}), 3000);
      }
    }
  });

  sock.ev.on('messages.update', (updates) => {
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

  // Se outro processo já é dono da sessão, não abrimos um socket concorrente
  // (evita o connectionReplaced em loop). Avisamos o chamador — o worker duplicado
  // encerra a si mesmo; o painel apenas mostra que já está logado.
  if (await anotherOwnerAlive()) {
    logger.warn(
      'WhatsApp já está conectado em outro processo — ignorando novo login e mantendo a sessão existente.',
    );
    allowReconnect = false;
    throw new WhatsAppOwnedElsewhereError();
  }

  isConnecting = true;
  allowReconnect = true;
  syncConnectStateToRedis('connecting');
  const { state, saveCreds } = await useMultiFileAuthState(getWhatsAppAuthPath());
  const sock = await createSocket(state, saveCreds);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WhatsApp connection timeout')), 120_000);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
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

  await releaseOwnerLock();

  if (sock) {
    sock.ev.removeAllListeners('connection.update');
    sock.ev.removeAllListeners('creds.update');
    sock.ev.removeAllListeners('messages.update');
    await sock.ws.close();
    logger.info('WhatsApp disconnected');
  }
}

/** Socket vivo atual (ou undefined se desconectado). */
export function getWhatsAppSocket(): WASocket | undefined {
  return socket;
}

/**
 * Devolve o socket vivo para o caminho de envio. Diferente de connectWhatsApp(),
 * NÃO força uma reconexão concorrente quando a sessão pertence a outro processo —
 * isso reiniciaria o ping-pong. Se outro processo é o dono, lança na hora para o
 * BullMQ tentar o envio de novo mais tarde (o outro processo faz o envio). Numa
 * queda normal, aguarda a reconexão central subir dentro do timeout.
 */
export async function requireWhatsAppSocket(timeoutMs = 45_000): Promise<WASocket> {
  if (socket) return socket;

  // A sessão é de outro processo: não brigamos, deixamos o dono enviar.
  if (await anotherOwnerAlive()) {
    throw new Error('WhatsApp conectado em outro processo — o envio será tentado novamente.');
  }

  if (allowReconnect && !isConnecting) {
    void connectWhatsApp().catch(() => {});
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (socket) return socket;
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (socket) return socket;
    if (await anotherOwnerAlive()) {
      throw new Error('WhatsApp conectado em outro processo — o envio será tentado novamente.');
    }
    if (allowReconnect && !isConnecting) {
      void connectWhatsApp().catch(() => {});
    }
  }

  throw new Error(
    'WhatsApp indisponível: sem sessão ativa (reconectando). O envio será tentado novamente.',
  );
}

export async function sendOffer(
  sock: WASocket,
  channelId: string,
  imageUrl: string | null,
  caption: string,
): Promise<WAMessage> {
  const validation = await validateWhatsAppDestination(sock, channelId);
  if (!validation.valid) {
    throw new Error(`Destino WhatsApp inválido: ${validation.reason}`);
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
            'Offer sent to WhatsApp destination',
          );
          return result;
        }
      }
      logger.warn(
        { imageUrl, status: response.status },
        'Falha ao baixar imagem — enviando só texto',
      );
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
    'Offer sent to WhatsApp destination',
  );
  return result;
}
