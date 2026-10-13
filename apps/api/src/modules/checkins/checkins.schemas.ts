import { z } from 'zod';

export const checkInSchema = z.object({
  payload: z.string().trim().min(12).max(500).optional(),
  ticketCode: z.string().trim().min(8).max(40).optional(),
  eventId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.payload || value.ticketCode), {
  message: 'Provide a QR payload or ticket code.',
});

export const checkInListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  eventId: z.string().uuid().optional(),
  result: z.enum(['VALID', 'ALREADY_USED', 'CANCELLED', 'EXPIRED', 'INVALID']).optional(),
});

export const checkInEventParamsSchema = z.object({ eventId: z.string().uuid() });
