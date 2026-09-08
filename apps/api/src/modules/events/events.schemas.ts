import { z } from 'zod';

export const eventListQuerySchema = z
  .object({
    search: z.string().trim().min(1).max(120).optional(),
    category: z.string().trim().min(1).max(120).optional(),
    location: z.string().trim().min(1).max(160).optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must use YYYY-MM-DD format')
      .refine((value) => !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime()), {
        message: 'date must be a valid calendar date',
      })
      .optional(),
    type: z.enum(['FREE', 'PAID']).optional(),
    freePaid: z.enum(['free', 'paid']).optional(),
    minPrice: z.coerce.number().finite().min(0).optional(),
    maxPrice: z.coerce.number().finite().min(0).optional(),
    sort: z
      .enum(['upcoming', 'newest', 'popular', 'price-low-high', 'price-high-low'])
      .default('upcoming'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(12),
  })
  .superRefine((value, context) => {
    if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['maxPrice'],
        message: 'maxPrice must be greater than or equal to minPrice.',
      });
    }
  });

export const eventSlugSchema = z.object({
  slug: z.string().trim().min(1).max(220),
});

export const relatedEventQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(8).default(4),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;
