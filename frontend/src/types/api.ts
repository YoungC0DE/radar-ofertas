export type { ApiErrorBody } from '@radar/shared';
export type * from '@radar/shared';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, body: import('@radar/shared').ApiErrorBody) {
    super(body.error);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
  }
}
