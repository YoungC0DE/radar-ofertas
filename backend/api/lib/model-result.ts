import { mapServiceError } from './map-service-error.js';

export function assertOkResult<T extends { ok: boolean; error?: string }>(
  result: T,
): asserts result is T & { ok: true } {
  if (!result.ok) {
    mapServiceError(new Error(result.error ?? 'Operação falhou'));
  }
}
