import {
  cancelMercadoLivreConnection,
  finishMercadoLivreConnection,
  getMercadoLivreConnectionState,
  getWhatsAppConnectionState,
  startMercadoLivreConnection,
  startWhatsAppConnection,
} from '../models/connection-model.js';

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
