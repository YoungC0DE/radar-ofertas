import { loginAffiliateSession } from './mercado-livre/auth.js';
import { logger } from './utils/logger.js';

async function main(): Promise<void> {
  logger.info('Iniciando login de afiliado Mercado Livre');
  await loginAffiliateSession();
}

main().catch((error) => {
  logger.error({ error }, 'ML affiliate login failed');
  process.exit(1);
});
