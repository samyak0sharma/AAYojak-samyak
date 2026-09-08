import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';

export async function listEventReviews(eventId: string, page: number, limit: number) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
  }

  const where = { eventId, status: 'PUBLISHED' as const };
  const [items, total, aggregate] = await prisma.$transaction([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.aggregate({ where, _avg: { rating: true } }),
  ]);

  return {
    items,
    summary: { averageRating: aggregate._avg.rating ?? 0, reviewCount: total },
    pagination: pagination(page, limit, total),
  };
}

