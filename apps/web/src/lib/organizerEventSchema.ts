import { z } from 'zod';

const tier = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(1, 'Tier name is required').max(100), description: z.string().max(1000).optional(), price: z.coerce.number().min(0), currency: z.string().length(3).default('NPR'), quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'), saleStartAt: z.string().optional(), saleEndAt: z.string().optional(), isActive: z.boolean().default(true) });
export const organizerEventFormSchema = z.object({
  title: z.string().trim().min(3, 'Add an event title').max(220), slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase words separated by hyphens').optional().or(z.literal('')),
  description: z.string().trim().min(20, 'Add a fuller description').max(20_000), categoryIds: z.array(z.string().uuid()).min(1, 'Choose at least one category'), coverImageUrl: z.string().url('Use a valid image URL').optional().or(z.literal('')),
  media: z.array(z.object({ mediaType: z.enum(['IMAGE', 'VIDEO']), url: z.string().url('Use a valid media URL'), altText: z.string().optional(), sortOrder: z.coerce.number().int().min(0) })),
  startAt: z.string().min(1, 'Choose a start time'), endAt: z.string().min(1, 'Choose an end time'), timezone: z.string().min(1), venueName: z.string().trim().min(2), address: z.string().trim().min(2), capacity: z.string().optional(), latitude: z.string().optional(), longitude: z.string().optional(), eventType: z.enum(['FREE', 'PAID']), terms: z.string().optional(), faqs: z.array(z.object({ question: z.string().trim().min(2), answer: z.string().trim().min(2), sortOrder: z.coerce.number().int().min(0) })), ticketTiers: z.array(tier),
}).superRefine((value, context) => {
  if (new Date(value.endAt) <= new Date(value.startAt)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'End time must be after start time.' });
  if (value.eventType === 'FREE' && value.ticketTiers.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ticketTiers'], message: 'Free events do not need ticket tiers.' });
  if (value.eventType === 'PAID' && !value.ticketTiers.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ['ticketTiers'], message: 'Paid events require at least one ticket tier.' });
});
export type OrganizerEventFormValues = z.infer<typeof organizerEventFormSchema>;
