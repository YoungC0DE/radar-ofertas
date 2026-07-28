import { z } from 'zod';

export const offersListQuerySchema = z.object({
  status: z.enum(['all', 'pending', 'sent']).default('all'),
  page: z.coerce.number().int().positive().default(1),
});

export const searchLimitBodySchema = z.object({
  searchLimit: z.number().int().min(1).max(500),
});

export const affiliateDelayBodySchema = z.object({
  affiliateDelayMs: z.number().int().min(0).max(60_000),
  affiliateBacklogDelayMinutes: z.number().int().min(1).max(60),
  affiliateBacklogThreshold: z.number().int().min(1).max(100),
});

export const offerIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});
