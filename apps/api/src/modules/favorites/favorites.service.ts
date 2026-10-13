import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';

const favoriteSelect = { id: true, createdAt: true, event: { select: { id: true, slug: true, title: true, coverImageUrl: true, eventType: true, startAt: true, endAt: true, venueName: true, address: true, organizer: { select: { id: true, name: true, slug: true } } } } } satisfies Prisma.FavoriteSelect;

export async function addFavorite(userId: string, eventId: string) {
  const event = await prisma.event.findFirst({ where: { id: eventId, status: 'PUBLISHED', organizer: { isApproved: true } }, select: { id: true } });
  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
  try {
    return await prisma.favorite.create({ data: { userId, eventId }, select: favoriteSelect });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new AppError(409, 'EVENT_ALREADY_FAVORITED', 'This event is already in your favorites.');
    throw error;
  }
}

export async function removeFavorite(userId: string, eventId: string) {
  const result = await prisma.favorite.deleteMany({ where: { userId, eventId } });
  return { removed: result.count === 1 };
}

export async function listFavorites(userId: string, page: number, limit: number) {
  const where = { userId };
  const [items, total] = await prisma.$transaction([
    prisma.favorite.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: favoriteSelect }),
    prisma.favorite.count({ where }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}
