import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';
import type { EventListQuery } from './events.schemas.js';

export const publicEventSelect = {
  id: true,
  slug: true,
  title: true,
  description: true,
  coverImageUrl: true,
  eventType: true,
  status: true,
  startAt: true,
  endAt: true,
  timezone: true,
  venueName: true,
  address: true,
  capacity: true,
  latitude: true,
  longitude: true,
  publishedAt: true,
  organizer: {
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logoUrl: true,
    },
  },
  categories: {
    select: {
      category: {
        select: { id: true, name: true, slug: true },
      },
    },
  },
  media: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, mediaType: true, url: true, altText: true, sortOrder: true },
  },
  faqs: {
    orderBy: { sortOrder: 'asc' as const },
    select: { id: true, question: true, answer: true, sortOrder: true },
  },
  ticketTiers: {
    where: { isActive: true },
    orderBy: { price: 'asc' as const },
    select: {
      id: true,
      name: true,
      description: true,
      price: true,
      currency: true,
      quantity: true,
      reservedQuantity: true,
      soldQuantity: true,
      saleStartAt: true,
      saleEndAt: true,
      isActive: true,
    },
  },
  _count: {
    select: { bookings: true, reviews: true, favorites: true },
  },
} satisfies Prisma.EventSelect;

function dateRange(date: string) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { gte: start, lt: end };
}

function buildEventWhere(query: EventListQuery): Prisma.EventWhereInput {
  const eventType = query.type ?? (query.freePaid ? query.freePaid.toUpperCase() as 'FREE' | 'PAID' : undefined);
  const conditions: Prisma.EventWhereInput[] = [{ status: 'PUBLISHED' }, { organizer: { isApproved: true } }];
  if (eventType) conditions.push({ eventType });
  if (query.search) {
    conditions.push({
      OR: [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { venueName: { contains: query.search, mode: 'insensitive' } },
        { address: { contains: query.search, mode: 'insensitive' } },
      ],
    });
  }
  if (query.location) {
    conditions.push({
      OR: [
        { venueName: { contains: query.location, mode: 'insensitive' } },
        { address: { contains: query.location, mode: 'insensitive' } },
      ],
    });
  }
  if (query.category) {
    conditions.push({ categories: { some: { category: { slug: query.category, isActive: true } } } });
  }
  if (query.date) conditions.push({ startAt: dateRange(query.date) });
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    conditions.push({
      ticketTiers: {
        some: {
          isActive: true,
          price: {
            ...(query.minPrice !== undefined ? { gte: query.minPrice } : {}),
            ...(query.maxPrice !== undefined ? { lte: query.maxPrice } : {}),
          },
        },
      },
    });
  }
  return { AND: conditions };
}

async function findPriceOrderedEventIds(
  query: EventListQuery,
  skip: number,
  limit: number,
) {
  // Prisma's relation ordering supports aggregates but not MIN(price) over a
  // one-to-many relation. This bounded SQL projection keeps price sorting in
  // PostgreSQL while all user input remains parameterized through Prisma.sql.
  const conditions: Prisma.Sql[] = [Prisma.sql`e."status" = 'PUBLISHED'`, Prisma.sql`EXISTS (SELECT 1 FROM "Organizer" o WHERE o."id" = e."organizerId" AND o."isApproved" = true)`];
  const eventType = query.type ?? (query.freePaid ? query.freePaid.toUpperCase() : undefined);
  if (eventType) conditions.push(Prisma.sql`e."eventType" = ${eventType}`);
  if (query.search) {
    const pattern = `%${query.search}%`;
    conditions.push(
      Prisma.sql`(e."title" ILIKE ${pattern} OR e."description" ILIKE ${pattern} OR e."venueName" ILIKE ${pattern} OR e."address" ILIKE ${pattern})`,
    );
  }
  if (query.location) {
    const pattern = `%${query.location}%`;
    conditions.push(Prisma.sql`(e."venueName" ILIKE ${pattern} OR e."address" ILIKE ${pattern})`);
  }
  if (query.category) {
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "EventCategory" ec JOIN "Category" c ON c."id" = ec."categoryId" WHERE ec."eventId" = e."id" AND c."slug" = ${query.category} AND c."isActive" = true)`,
    );
  }
  if (query.date) {
    const range = dateRange(query.date);
    conditions.push(Prisma.sql`e."startAt" >= ${range.gte}`);
    conditions.push(Prisma.sql`e."startAt" < ${range.lt}`);
  }
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const tierConditions: Prisma.Sql[] = [Prisma.sql`pt."isActive" = true`];
    if (query.minPrice !== undefined) tierConditions.push(Prisma.sql`pt."price" >= ${query.minPrice}`);
    if (query.maxPrice !== undefined) tierConditions.push(Prisma.sql`pt."price" <= ${query.maxPrice}`);
    conditions.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "TicketTier" pt WHERE pt."eventId" = e."id" AND ${Prisma.join(tierConditions, ' AND ')})`,
    );
  }

  const direction = query.sort === 'price-high-low' ? Prisma.raw('DESC') : Prisma.raw('ASC');
  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT e."id"
    FROM "Event" e
    WHERE ${Prisma.join(conditions, ' AND ')}
    ORDER BY (SELECT MIN(pt."price") FROM "TicketTier" pt WHERE pt."eventId" = e."id" AND pt."isActive" = true) ${direction} NULLS LAST, e."startAt" ASC
    OFFSET ${skip}
    LIMIT ${limit}
  `);
  return rows.map((row) => row.id);
}

export async function listEvents(query: EventListQuery) {
  const skip = (query.page - 1) * query.limit;
  const where = buildEventWhere(query);

  if (query.sort === 'upcoming') {
    const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
    where.AND = [...existingAnd, { startAt: { gte: new Date() } }];
  }

  const orderBy: Prisma.EventOrderByWithRelationInput[] =
    query.sort === 'newest'
      ? [{ createdAt: 'desc' }, { startAt: 'asc' }]
      : query.sort === 'popular'
        ? [{ bookings: { _count: 'desc' } }, { startAt: 'asc' }]
        : [{ startAt: 'asc' }];

  const totalPromise = prisma.event.count({ where });
  if (query.sort === 'price-low-high' || query.sort === 'price-high-low') {
    const [ids, total] = await Promise.all([
      findPriceOrderedEventIds(query, skip, query.limit),
      totalPromise,
    ]);
    const events = await prisma.event.findMany({ where: { id: { in: ids } }, select: publicEventSelect });
    const eventById = new Map(events.map((event) => [event.id, event]));
    return {
      items: ids.flatMap((id) => {
        const event = eventById.get(id);
        return event ? [event] : [];
      }),
      pagination: pagination(query.page, query.limit, total),
    };
  }

  const [items, total] = await Promise.all([
    prisma.event.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
      select: publicEventSelect,
    }),
    totalPromise,
  ]);

  return { items, pagination: pagination(query.page, query.limit, total) };
}

export async function getEventBySlug(slug: string) {
  const event = await prisma.event.findFirst({
    where: { slug, status: 'PUBLISHED', organizer: { isApproved: true } },
    select: publicEventSelect,
  });
  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
  }
  return event;
}

export async function getRelatedEvents(slug: string, limit: number) {
  const event = await prisma.event.findFirst({
    where: { slug, status: 'PUBLISHED', organizer: { isApproved: true } },
    select: {
      id: true,
      organizerId: true,
      categories: { select: { categoryId: true } },
    },
  });
  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
  }

  const categoryIds = event.categories.map(({ categoryId }) => categoryId);
  return prisma.event.findMany({
    where: {
      status: 'PUBLISHED',
      organizer: { isApproved: true },
      startAt: { gte: new Date() },
      id: { not: event.id },
      OR: [
        { organizerId: event.organizerId },
        ...(categoryIds.length ? [{ categories: { some: { categoryId: { in: categoryIds } } } }] : []),
      ],
    },
    orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
    take: limit,
    select: publicEventSelect,
  });
}
