import { z } from 'zod';

export const eventReviewsParamsSchema = z.object({
  eventId: z.string().uuid(),
});

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

