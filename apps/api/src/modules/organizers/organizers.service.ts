import { Prisma, type BookingStatus, type EventStatus, type TicketStatus } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';
import type { OrganizerEventInput, OrganizerEventListQuery, OrganizerProfileInput } from './organizers.schemas.js';

const publicOrganizerSelect = {
  id: true, name: true, slug: true, description: true, logoUrl: true, websiteUrl: true,
  contactEmail: true, contactPhone: true, location: true, socialLinks: true, createdAt: true,
  _count: { select: { events: { where: { status: 'PUBLISHED' } } } },
} as const;

const ownerOrganizerSelect = { ...publicOrganizerSelect, userId: true, isApproved: true, updatedAt: true } as const;

const organizerEventSelect = {
  id: true, organizerId: true, slug: true, title: true, description: true, coverImageUrl: true,
  eventType: true, status: true, startAt: true, endAt: true, timezone: true, venueName: true,
  address: true, capacity: true, latitude: true, longitude: true, terms: true, publishedAt: true, moderatedAt: true,
  moderationNote: true, createdAt: true, updatedAt: true,
  categories: { select: { category: { select: { id: true, name: true, slug: true } } } },
  media: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, mediaType: true, url: true, altText: true, sortOrder: true } },
  faqs: { orderBy: { sortOrder: 'asc' as const }, select: { id: true, question: true, answer: true, sortOrder: true } },
  ticketTiers: { orderBy: { price: 'asc' as const }, select: { id: true, name: true, description: true, price: true, currency: true, quantity: true, reservedQuantity: true, soldQuantity: true, saleStartAt: true, saleEndAt: true, isActive: true } },
  _count: { select: { bookings: true, reviews: true, favorites: true } },
} satisfies Prisma.EventSelect;

function slugify(value: string) {
  const slug = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
  return slug || 'event';
}

async function uniqueEventSlug(value: string, excludeId?: string) {
  const base = slugify(value); let candidate = base; let suffix = 2;
  while (await prisma.event.findFirst({ where: { slug: candidate, ...(excludeId ? { id: { not: excludeId } } : {}) }, select: { id: true } })) {
    candidate = `${base}-${suffix}`.slice(0, 220); suffix += 1;
  }
  return candidate;
}

async function uniqueOrganizerSlug(value: string) {
  const base = slugify(value); let candidate = base; let suffix = 2;
  while (await prisma.organizer.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${suffix}`.slice(0, 180); suffix += 1;
  }
  return candidate;
}

function dateRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`); const end = new Date(start); end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

async function requireOwner(userId: string) {
  const organizer = await prisma.organizer.findUnique({ where: { userId }, select: ownerOrganizerSelect });
  if (!organizer) throw new AppError(409, 'ORGANIZER_PROFILE_REQUIRED', 'Create an organizer profile before managing events.');
  return organizer;
}

async function validateCategories(categoryIds: string[]) {
  const categories = await prisma.category.findMany({ where: { id: { in: categoryIds }, isActive: true }, select: { id: true } });
  if (categories.length !== new Set(categoryIds).size) throw new AppError(422, 'INVALID_CATEGORIES', 'One or more selected categories are unavailable.');
}

function jsonValue(value: Record<string, string> | null | undefined) {
  if (value === undefined) return undefined;
  return value === null ? Prisma.JsonNull : value;
}

export async function listOrganizers(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [items, total] = await prisma.$transaction([
    prisma.organizer.findMany({ where: { isApproved: true }, orderBy: { name: 'asc' }, skip, take: limit, select: publicOrganizerSelect }),
    prisma.organizer.count({ where: { isApproved: true } }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function getOrganizer(id: string) {
  const organizer = await prisma.organizer.findFirst({ where: { id, isApproved: true }, select: publicOrganizerSelect });
  if (!organizer) throw new AppError(404, 'ORGANIZER_NOT_FOUND', 'The requested organizer was not found.');
  return organizer;
}

export async function getOrganizerEvents(id: string) {
  const organizer = await prisma.organizer.findFirst({ where: { id, isApproved: true }, select: { id: true } });
  if (!organizer) throw new AppError(404, 'ORGANIZER_NOT_FOUND', 'The requested organizer was not found.');
  return prisma.event.findMany({ where: { organizerId: id, status: 'PUBLISHED' }, orderBy: { startAt: 'asc' }, select: {
    id: true, slug: true, title: true, coverImageUrl: true, eventType: true, startAt: true, endAt: true, timezone: true, venueName: true, address: true,
  } });
}

export async function getMyOrganizer(userId: string) { return prisma.organizer.findUnique({ where: { userId }, select: ownerOrganizerSelect }); }

export async function upsertMyOrganizer(userId: string, input: OrganizerProfileInput) {
  const existing = await prisma.organizer.findUnique({ where: { userId }, select: { id: true } });
  if (existing) return prisma.organizer.update({ where: { id: existing.id }, data: { ...input, socialLinks: jsonValue(input.socialLinks) }, select: ownerOrganizerSelect });
  if (!input.name) throw new AppError(422, 'ORGANIZER_NAME_REQUIRED', 'An organizer name is required to create a profile.');
  try {
    return await prisma.organizer.create({ data: { ...input, name: input.name, slug: await uniqueOrganizerSlug(input.name), socialLinks: jsonValue(input.socialLinks), userId }, select: ownerOrganizerSelect });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'ORGANIZER_SLUG_EXISTS', 'An organizer with this name is already registered.');
    throw error;
  }
}

function eventWhereForOwner(userId: string, id?: string): Prisma.EventWhereInput { return { ...(id ? { id } : {}), organizer: { userId } }; }

export async function listMyEvents(userId: string, query: OrganizerEventListQuery) {
  const conditions: Prisma.EventWhereInput[] = [eventWhereForOwner(userId)];
  if (query.status) conditions.push({ status: query.status as EventStatus });
  if (query.search) conditions.push({ OR: [{ title: { contains: query.search, mode: 'insensitive' } }, { venueName: { contains: query.search, mode: 'insensitive' } }, { address: { contains: query.search, mode: 'insensitive' } }] });
  if (query.date) conditions.push({ startAt: dateRange(query.date) });
  const orderBy: Prisma.EventOrderByWithRelationInput[] = query.sort === 'newest' ? [{ createdAt: 'desc' }, { startAt: 'asc' }] : query.sort === 'updated' ? [{ updatedAt: 'desc' }, { startAt: 'asc' }] : query.sort === 'title' ? [{ title: 'asc' }, { startAt: 'asc' }] : [{ startAt: 'asc' }, { createdAt: 'desc' }];
  const where = { AND: conditions };
  const [items, total] = await prisma.$transaction([
    prisma.event.findMany({ where, orderBy, skip: (query.page - 1) * query.limit, take: query.limit, select: organizerEventSelect }),
    prisma.event.count({ where }),
  ]);
  return { items, pagination: pagination(query.page, query.limit, total) };
}

export async function getMyEvent(userId: string, id: string) {
  const event = await prisma.event.findFirst({ where: eventWhereForOwner(userId, id), select: organizerEventSelect });
  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested organizer event was not found.');
  return event;
}

function tierCreateData(input: OrganizerEventInput) { return input.ticketTiers.map((tier) => ({ name: tier.name, description: tier.description ?? null, price: tier.price, currency: tier.currency.toUpperCase(), quantity: tier.quantity, saleStartAt: tier.saleStartAt ?? null, saleEndAt: tier.saleEndAt ?? null, isActive: tier.isActive })); }
function eventData(input: OrganizerEventInput, slug: string) { return { slug, title: input.title, description: input.description, coverImageUrl: input.coverImageUrl ?? null, eventType: input.eventType, startAt: input.startAt, endAt: input.endAt, timezone: input.timezone, venueName: input.venueName, address: input.address, capacity: input.capacity ?? null, latitude: input.latitude ?? null, longitude: input.longitude ?? null, terms: input.terms ?? null }; }

async function writeEventRelations(tx: Prisma.TransactionClient, eventId: string, input: OrganizerEventInput, includeTickets = true) {
  if (input.categoryIds.length) await tx.eventCategory.createMany({ data: input.categoryIds.map((categoryId) => ({ eventId, categoryId })), skipDuplicates: true });
  if (input.media.length) await tx.eventMedia.createMany({ data: input.media.map((media) => ({ eventId, ...media, altText: media.altText ?? null })) });
  if (input.faqs.length) await tx.fAQ.createMany({ data: input.faqs.map((faq) => ({ eventId, ...faq })) });
  if (includeTickets && input.ticketTiers.length) await tx.ticketTier.createMany({ data: tierCreateData(input).map((tier) => ({ eventId, ...tier })) });
}

export async function createMyEvent(userId: string, input: OrganizerEventInput) {
  const organizer = await requireOwner(userId); await validateCategories(input.categoryIds); const slug = await uniqueEventSlug(input.slug ?? input.title);
  try {
    return await prisma.$transaction(async (tx) => {
      const event = await tx.event.create({ data: { organizerId: organizer.id, status: 'DRAFT', ...eventData(input, slug) } });
      await writeEventRelations(tx, event.id, input);
      return tx.event.findUniqueOrThrow({ where: { id: event.id }, select: organizerEventSelect });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'EVENT_SLUG_EXISTS', 'An event with this slug already exists.');
    throw error;
  }
}

function normalizedTierSnapshot(event: Prisma.EventGetPayload<{ select: typeof organizerEventSelect }>) { return event.ticketTiers.map((tier) => `${tier.id}:${tier.name}:${tier.price.toString()}:${tier.quantity}:${tier.isActive}`).sort().join('|'); }

export async function updateMyEvent(userId: string, id: string, input: OrganizerEventInput) {
  const existing = await getMyEvent(userId, id); await validateCategories(input.categoryIds); const slug = input.slug ? await uniqueEventSlug(input.slug, id) : existing.slug;
  const bookingCount = await prisma.booking.count({ where: { eventId: id } });
  if (bookingCount > 0) {
    const requestedTierSnapshot = input.ticketTiers.map((tier) => `${tier.id ?? 'new'}:${tier.name}:${tier.price}:${tier.quantity}:${tier.isActive}`).sort().join('|');
    if (input.eventType !== existing.eventType || requestedTierSnapshot !== normalizedTierSnapshot(existing)) throw new AppError(409, 'EVENT_HAS_BOOKINGS', 'Financial and ticket fields cannot be changed after bookings exist.');
  }
  const nextStatus: EventStatus = ['APPROVED', 'PUBLISHED', 'SUBMITTED'].includes(existing.status) ? 'SUBMITTED' : existing.status;
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.event.update({ where: { id }, data: { ...eventData(input, slug), status: nextStatus, publishedAt: nextStatus === 'PUBLISHED' ? existing.publishedAt : null, moderationNote: null } });
      await tx.eventCategory.deleteMany({ where: { eventId: id } }); await tx.eventMedia.deleteMany({ where: { eventId: id } }); await tx.fAQ.deleteMany({ where: { eventId: id } });
      if (bookingCount === 0) await tx.ticketTier.deleteMany({ where: { eventId: id } });
      await writeEventRelations(tx, id, input, bookingCount === 0);
      return tx.event.findUniqueOrThrow({ where: { id }, select: organizerEventSelect });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'EVENT_SLUG_EXISTS', 'An event with this slug already exists.');
    throw error;
  }
}

export async function submitMyEvent(userId: string, id: string) {
  const event = await getMyEvent(userId, id);
  if (!['DRAFT', 'REJECTED'].includes(event.status)) throw new AppError(409, 'EVENT_NOT_SUBMITTABLE', 'Only draft or rejected events can be submitted.');
  if (!event.categories.length || !event.title || !event.description || (event.eventType === 'PAID' && !event.ticketTiers.length)) throw new AppError(422, 'EVENT_INCOMPLETE', 'Complete the event details and ticket configuration before submitting.');
  return prisma.event.update({ where: { id }, data: { status: 'SUBMITTED', moderationNote: null }, select: organizerEventSelect });
}

export async function cancelMyEvent(userId: string, id: string) {
  return prisma.$transaction(async (tx) => {
    const event = await tx.event.findFirst({ where: { id, organizer: { userId } }, select: { id: true, title: true, status: true, bookings: { where: { status: { in: ['PENDING', 'CONFIRMED'] } }, select: { id: true, userId: true, status: true, items: { select: { ticketTierId: true, quantity: true } } } } } });
    if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
    if (event.status === 'CANCELLED') throw new AppError(409, 'EVENT_ALREADY_CANCELLED', 'This event has already been cancelled.');
    await tx.event.update({ where: { id }, data: { status: 'CANCELLED' } });
    for (const booking of event.bookings) {
      if (booking.status === 'PENDING') {
        await tx.booking.update({ where: { id: booking.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
        await tx.payment.updateMany({ where: { bookingId: booking.id, status: { in: ['INITIATED', 'PENDING'] } }, data: { status: 'CANCELLED' } });
        for (const item of booking.items) if (item.ticketTierId) await tx.ticketTier.update({ where: { id: item.ticketTierId }, data: { reservedQuantity: { decrement: item.quantity } } });
      } else {
        await tx.ticket.updateMany({ where: { bookingId: booking.id, status: 'ISSUED' }, data: { status: 'CANCELLED' } });
      }
      await tx.notification.create({ data: { userId: booking.userId, type: 'CANCELLATION', title: 'Event cancelled', body: `The event "${event.title}" has been cancelled by the organizer. Contact support about any applicable refund.`, data: { eventId: event.id, bookingId: booking.id, status: 'CANCELLED' } } });
    }
    return tx.event.findUniqueOrThrow({ where: { id }, select: organizerEventSelect });
  });
}
export async function deleteMyDraft(userId: string, id: string) {
  const event = await getMyEvent(userId, id); if (!['DRAFT', 'REJECTED'].includes(event.status)) throw new AppError(409, 'EVENT_NOT_DELETABLE', 'Only draft or rejected events can be deleted.'); if (event._count.bookings > 0) throw new AppError(409, 'EVENT_HAS_HISTORY', 'Events with booking history cannot be deleted.');
  await prisma.event.delete({ where: { id } }); return { id };
}

const organizerBookingSelect = {
  id: true, bookingNumber: true, status: true, currency: true, subtotal: true, fees: true, discount: true, total: true, confirmedAt: true, createdAt: true,
  user: { select: { id: true, email: true, firstName: true, lastName: true } },
  event: { select: { id: true, title: true, slug: true, startAt: true, venueName: true } },
  items: { select: { id: true, ticketName: true, quantity: true, unitPrice: true, lineTotal: true, ticketTier: { select: { id: true, name: true } } } },
  payments: { select: { id: true, provider: true, status: true, amount: true, currency: true, completedAt: true }, orderBy: { createdAt: 'desc' as const } },
} satisfies Prisma.BookingSelect;

function ownerBookingWhere(userId: string): Prisma.BookingWhereInput { return { event: { organizer: { userId } } }; }

export async function listMyBookings(userId: string, page: number, limit: number, status?: BookingStatus, search?: string, eventId?: string) {
  const where: Prisma.BookingWhereInput = { ...ownerBookingWhere(userId), ...(status ? { status } : {}), ...(eventId ? { eventId } : {}), ...(search ? { OR: [{ bookingNumber: { contains: search, mode: 'insensitive' } }, { event: { title: { contains: search, mode: 'insensitive' } } }, { user: { email: { contains: search, mode: 'insensitive' } } }] } : {}) };
  const [items, total] = await prisma.$transaction([prisma.booking.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: organizerBookingSelect }), prisma.booking.count({ where })]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function listMyAttendees(userId: string, page: number, limit: number, query: { search?: string; eventId?: string; checkedIn?: 'true' | 'false' }) {
  const bookings = await prisma.booking.findMany({ where: { ...ownerBookingWhere(userId), status: 'CONFIRMED', ...(query.eventId ? { eventId: query.eventId } : {}), ...(query.search ? { OR: [{ bookingNumber: { contains: query.search, mode: 'insensitive' } }, { event: { title: { contains: query.search, mode: 'insensitive' } } }, { user: { email: { contains: query.search, mode: 'insensitive' } } }, { user: { firstName: { contains: query.search, mode: 'insensitive' } } }, { user: { lastName: { contains: query.search, mode: 'insensitive' } } }] } : {}) }, orderBy: { createdAt: 'desc' }, select: { id: true, bookingNumber: true, status: true, event: { select: { id: true, title: true, startAt: true } }, user: { select: { id: true, firstName: true, lastName: true, email: true } }, items: { select: { ticketName: true, quantity: true, tickets: { select: { id: true, ticketCode: true, status: true, checkedInAt: true } } } } } });
  type AttendeeRow = { bookingId: string; bookingNumber: string; event: { id: string; title: string; startAt: Date }; attendee: { id: string; firstName: string; lastName: string; email: string }; ticketName: string; quantity: number; ticket: { id: string; ticketCode: string; status: TicketStatus; checkedInAt: Date | null } | null };
  const rows: AttendeeRow[] = bookings.flatMap<AttendeeRow>((booking) => booking.items.flatMap<AttendeeRow>((item) => item.tickets.length ? item.tickets.map((ticket) => ({ bookingId: booking.id, bookingNumber: booking.bookingNumber, event: booking.event, attendee: booking.user, ticketName: item.ticketName, quantity: item.quantity, ticket })) : [{ bookingId: booking.id, bookingNumber: booking.bookingNumber, event: booking.event, attendee: booking.user, ticketName: item.ticketName, quantity: item.quantity, ticket: null }]));
  const filtered = query.checkedIn ? rows.filter((row) => query.checkedIn === 'true' ? Boolean(row.ticket?.checkedInAt) : !row.ticket?.checkedInAt) : rows;
  return { items: filtered.slice((page - 1) * limit, page * limit), pagination: pagination(page, limit, filtered.length) };
}

const organizerTicketSelect = {
  id: true, ticketCode: true, status: true, issuedAt: true, checkedInAt: true,
  booking: { select: { id: true, bookingNumber: true, status: true, event: { select: { id: true, title: true, startAt: true } }, user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
  bookingItem: { select: { id: true, ticketName: true, quantity: true, unitPrice: true, ticketTier: { select: { id: true, name: true } } } },
} satisfies Prisma.TicketSelect;

export async function listMyTickets(userId: string, page: number, limit: number) {
  const where: Prisma.TicketWhereInput = { booking: ownerBookingWhere(userId) };
  const [items, total] = await prisma.$transaction([prisma.ticket.findMany({ where, orderBy: { issuedAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: organizerTicketSelect }), prisma.ticket.count({ where })]);
  return { items, pagination: pagination(page, limit, total) };
}

async function ownerId(userId: string) {
  const organizer = await prisma.organizer.findUnique({ where: { userId }, select: { id: true } });
  if (!organizer) throw new AppError(409, 'ORGANIZER_PROFILE_REQUIRED', 'Create an organizer profile first.'); return organizer.id;
}

export async function getMyAnalytics(userId: string) {
  const organizerId = await ownerId(userId); const eventWhere = { organizerId }; const bookingWhere = { event: { organizerId } };
  const [eventGroups, bookingGroups, ticketCount, confirmed, pending, refunded, completedPayments, rows] = await prisma.$transaction([
    prisma.event.groupBy({ by: ['status'], where: eventWhere, orderBy: { status: 'asc' }, _count: { _all: true } }), prisma.booking.groupBy({ by: ['status'], where: bookingWhere, orderBy: { status: 'asc' }, _count: { _all: true } }),
    prisma.ticket.count({ where: { booking: bookingWhere, status: { not: 'CANCELLED' } } }), prisma.booking.aggregate({ where: { ...bookingWhere, status: 'CONFIRMED' }, _sum: { total: true } }), prisma.booking.aggregate({ where: { ...bookingWhere, status: 'PENDING' }, _sum: { total: true } }), prisma.booking.aggregate({ where: { ...bookingWhere, status: 'REFUNDED' }, _sum: { total: true } }), prisma.payment.aggregate({ where: { status: 'COMPLETED', booking: bookingWhere }, _sum: { amount: true } }),
    prisma.booking.findMany({ where: bookingWhere, select: { createdAt: true, status: true, total: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  const eventCounts = Object.fromEntries((eventGroups as Array<{ status: EventStatus; _count: { _all: number } }>).map((row) => [row.status, row._count._all])); const bookingCounts = Object.fromEntries((bookingGroups as Array<{ status: BookingStatus; _count: { _all: number } }>).map((row) => [row.status, row._count._all])); const monthly = new Map<string, { bookings: number; revenue: number }>();
  for (const row of rows) { const key = row.createdAt.toISOString().slice(0, 7); const value = monthly.get(key) ?? { bookings: 0, revenue: 0 }; value.bookings += 1; if (row.status === 'CONFIRMED') value.revenue += Number(row.total); monthly.set(key, value); }
  return { overview: { totalEvents: Object.values(eventCounts).reduce((sum, count) => sum + Number(count), 0), publishedEvents: eventCounts.PUBLISHED ?? 0, draftEvents: eventCounts.DRAFT ?? 0, submittedEvents: eventCounts.SUBMITTED ?? 0, rejectedEvents: eventCounts.REJECTED ?? 0, totalBookings: Object.values(bookingCounts).reduce((sum, count) => sum + Number(count), 0), totalAttendees: bookingCounts.CONFIRMED ?? 0, ticketsSold: ticketCount, grossRevenue: Number(confirmed._sum.total ?? 0), successfulPayments: Number(completedPayments._sum.amount ?? 0), pendingRevenue: Number(pending._sum.total ?? 0), refundedAmount: Number(refunded._sum.total ?? 0) }, series: Array.from(monthly, ([month, value]) => ({ month, ...value })) };
}

export async function getMyRevenue(userId: string) {
  const { overview } = await getMyAnalytics(userId); return { grossRevenue: overview.grossRevenue, successfulPayments: overview.successfulPayments, pendingPayments: overview.pendingRevenue, refundedAmount: overview.refundedAmount, estimatedNetRevenue: overview.successfulPayments };
}
