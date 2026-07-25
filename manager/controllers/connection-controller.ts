import {
  cancelMercadoLivreConnection,
  finishMercadoLivreConnection,
  getMercadoLivreConnectionState,
  getWhatsAppConnectionState,
  startMercadoLivreConnection,
  startWhatsAppConnection,
} from '../models/connection-model.js';
import { getTelegramSessionStatusForAccount } from '../models/session-model.js';

export async function startWhatsAppConnectJson(accountId?: string): Promise<string> {
  return JSON.stringify(await startWhatsAppConnection(accountId));
}

export async function getWhatsAppConnectJson(accountId?: string): Promise<string> {
  return JSON.stringify(await getWhatsAppConnectionState(accountId));
}

export async function startMercadoLivreConnectJson(accountId?: string): Promise<string> {
  return JSON.stringify(await startMercadoLivreConnection(accountId));
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

export async function getTelegramConnectJson(accountId: string): Promise<string> {
  return JSON.stringify(await getTelegramSessionStatusForAccount(accountId));
}
