import { connectWhatsApp } from './whatsapp/index.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info('Iniciando login WhatsApp — escaneie o QR code quando aparecer');
  await connectWhatsApp();
  logger.info('WhatsApp conectado — sessão salva. Pode encerrar com Ctrl+C');
}

main().catch((error) => {
  logger.error({ error }, 'Login WhatsApp falhou');
  process.exit(1);
});
