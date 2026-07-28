import { ConflictError, NotFoundError, ValidationError } from '../errors/api-errors.js';

export function mapServiceError(error: unknown): never {
  const message = error instanceof Error ? error.message : 'Operação falhou';

  if (message.includes('não encontrad')) {
    throw new NotFoundError(message);
  }
  if (message.includes('já foi enviad') || message.includes('não pode ser removida')) {
    throw new ConflictError(message);
  }
  if (
    message.includes('Informe') ||
    message.includes('inválid') ||
    message.includes('desabilitado') ||
    message.includes('Nenhum canal')
  ) {
    throw new ValidationError(message);
  }

  throw error instanceof Error ? error : new Error(message);
}
