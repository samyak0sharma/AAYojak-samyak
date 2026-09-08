import { z } from 'zod';

export const ticketIdSchema = z.object({
  id: z.string().uuid(),
});

export const ticketListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

