import { z } from 'zod';

export const adminEventListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), status: z.enum(['SUBMITTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'CANCELLED']).default('SUBMITTED') });
export const adminEventIdSchema = z.object({ id: z.string().uuid() });
export const adminModerationSchema = z.object({ note: z.string().trim().max(5000).nullable().optional() });
