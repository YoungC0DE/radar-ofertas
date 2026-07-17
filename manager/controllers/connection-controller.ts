import {
  cancelMercadoLivreConnection,
  finishMercadoLivreConnection,
  getMercadoLivreConnectionState,
  getWhatsAppConnectionState,
  startMercadoLivreConnection,
  startWhatsAppConnection,
} from '../models/connection-model.js';
import { getTelegramSessionStatus } from '../models/session-model.js';

export function startWhatsAppConnectJson(): string {
  return JSON.stringify(startWhatsAppConnection());
}

export function getWhatsAppConnectJson(): string {
  return JSON.stringify(getWhatsAppConnectionState());
}

export function startMercadoLivreConnectJson(): string {
  return JSON.stringify(startMercadoLivreConnection());
}

export async function finishMercadoLivreConnectJson(): Promise<string> {
  return JSON.stringify(await finishMercadoLivreConnection());
}

export function getMercadoLivreConnectJson(): string {
  return JSON.stringify(getMercadoLivreConnectionState());
}

export async function cancelMercadoLivreConnectJson(): Promise<string> {
  await cancelMercadoLivreConnection();
  return JSON.stringify(getMercadoLivreConnectionState());
}

/**
 * Reverifica o Telegram contra a Bot API (bot válido + admin do canal). Não há
 * fluxo de "conectar": a config é do .env, então isto só confere e devolve o
 * status atualizado para o card.
 */
export async function getTelegramConnectJson(): Promise<string> {
  return JSON.stringify(await getTelegramSessionStatus());
}
