import { z } from 'zod';

export const reportCreateSchema = z.object({
  targetType: z.enum(['EVENT', 'ORGANIZER', 'REVIEW', 'USER']),
  targetId: z.string().uuid(),
  reason: z.string().trim().min(2).max(160),
  description: z.string().trim().min(5).max(5000),
});
export const reportListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), status: z.enum(['OPEN', 'INVESTIGATING', 'RESOLVED', 'REJECTED']).optional(), targetType: z.enum(['EVENT', 'ORGANIZER', 'REVIEW', 'USER']).optional() });
export const reportIdSchema = z.object({ id: z.string().uuid() });
export const reportUpdateSchema = z.object({ status: z.enum(['INVESTIGATING', 'RESOLVED', 'REJECTED']), resolutionNote: z.string().trim().max(5000).nullable().optional() });
