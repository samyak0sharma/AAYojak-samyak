import { Prisma } from '@prisma/client';
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

export async function createReview(userId: string, eventId: string, input: { rating: number; comment: string }) {
  const booking = await prisma.booking.findFirst({ where: { userId, eventId, status: 'CONFIRMED', event: { status: 'PUBLISHED', endAt: { lt: new Date() } } }, select: { id: true } });
  if (!booking) throw new AppError(403, 'REVIEW_NOT_ELIGIBLE', 'You can review an event only after attending a confirmed booking.');
  try {
    return await prisma.review.create({ data: { userId, eventId, rating: input.rating, comment: input.comment, status: 'PENDING' }, select: { id: true, rating: true, comment: true, status: true, createdAt: true } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'REVIEW_ALREADY_EXISTS', 'You have already reviewed this event.');
    throw error;
  }
}
