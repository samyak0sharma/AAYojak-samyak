import { z } from 'zod';

export const organizerIdSchema = z.object({
  id: z.string().uuid(),
});

export const organizerListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const nullableUrl = z.string().trim().url().max(500).nullable().optional();

const organizerProfileFields = z.object({
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).nullable().optional(),
  logoUrl: nullableUrl,
  websiteUrl: nullableUrl,
  contactEmail: z.string().trim().email().max(320).nullable().optional(),
  contactPhone: z.string().trim().max(32).nullable().optional(),
  location: z.string().trim().max(180).nullable().optional(),
  socialLinks: z.record(z.string().trim().url().max(500)).nullable().optional(),
});
export const organizerProfileSchema = organizerProfileFields.partial().refine((value) => Object.keys(value).length > 0, 'Provide at least one profile field.');

export const organizerEventListQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PUBLISHED', 'CANCELLED']).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(['upcoming', 'newest', 'updated', 'title']).default('upcoming'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

const mediaSchema = z.object({
  mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
  url: z.string().trim().url().max(2000),
  altText: z.string().trim().max(180).nullable().optional(),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

const faqSchema = z.object({
  question: z.string().trim().min(2).max(500),
  answer: z.string().trim().min(2).max(5000),
  sortOrder: z.coerce.number().int().min(0).max(1000).default(0),
});

const ticketTierSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(1000).nullable().optional(),
  price: z.coerce.number().finite().min(0).max(1_000_000),
  currency: z.string().trim().length(3).default('NPR'),
  quantity: z.coerce.number().int().min(1).max(10_000_000),
  saleStartAt: z.coerce.date().nullable().optional(),
  saleEndAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().default(true),
}).superRefine((tier, context) => {
  if (tier.saleStartAt && tier.saleEndAt && tier.saleEndAt <= tier.saleStartAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['saleEndAt'], message: 'Sale end must be after sale start.' });
  }
});

export const organizerEventSchema = z.object({
  title: z.string().trim().min(3).max(220),
  slug: z.string().trim().min(3).max(220).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'slug must be URL-friendly').optional(),
  description: z.string().trim().min(20).max(20_000),
  categoryIds: z.array(z.string().uuid()).min(1).max(10),
  coverImageUrl: nullableUrl,
  media: z.array(mediaSchema).max(30).default([]),
  startAt: z.coerce.date(),
  endAt: z.coerce.date(),
  timezone: z.string().trim().min(1).max(64).default('Asia/Kathmandu'),
  venueName: z.string().trim().min(2).max(180),
  address: z.string().trim().min(2).max(1000),
  capacity: z.coerce.number().int().min(1).max(10_000_000).nullable().optional(),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  eventType: z.enum(['FREE', 'PAID']),
  terms: z.string().trim().max(10_000).nullable().optional(),
  faqs: z.array(faqSchema).max(30).default([]),
  ticketTiers: z.array(ticketTierSchema).max(30).default([]),
}).superRefine((event, context) => {
  if (event.endAt <= event.startAt) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['endAt'], message: 'End time must be after start time.' });
  }
  if ((event.latitude === null) !== (event.longitude === null)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['latitude'], message: 'Latitude and longitude must be provided together.' });
  }
  const names = new Set<string>();
  for (const tier of event.ticketTiers) {
    const normalized = tier.name.toLowerCase();
    if (names.has(normalized)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['ticketTiers'], message: 'Ticket tier names must be unique.' });
    }
    names.add(normalized);
  }
  if (event.eventType === 'FREE' && event.ticketTiers.length > 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['ticketTiers'], message: 'Free events cannot contain paid ticket tiers.' });
  }
  if (event.eventType === 'PAID' && event.ticketTiers.length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['ticketTiers'], message: 'Paid events require at least one ticket tier.' });
  }
});

export const organizerEventIdSchema = z.object({ id: z.string().uuid() });
export const emptyBodySchema = z.object({}).default({});

export const organizerDataQuerySchema = z.object({
  status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'FAILED', 'REFUNDED']).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  eventId: z.string().uuid().optional(),
  checkedIn: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type OrganizerEventInput = z.infer<typeof organizerEventSchema>;
export type OrganizerEventListQuery = z.infer<typeof organizerEventListQuerySchema>;
export type OrganizerProfileInput = z.infer<typeof organizerProfileSchema>;
