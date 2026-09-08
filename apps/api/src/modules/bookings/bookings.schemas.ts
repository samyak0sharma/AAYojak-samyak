import { z } from 'zod';

export const bookingIdSchema = z.object({
  id: z.string().uuid(),
});

export const bookingListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED', 'REFUNDED']).optional(),
});

