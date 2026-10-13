import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';
import type { EventStatus } from '@prisma/client';

export async function getAdminOverview() {
  const [users, organizers, events, bookings, tickets, reviews, revenue] = await prisma.$transaction([
    prisma.user.count(),
    prisma.organizer.count(),
    prisma.event.count(),
    prisma.booking.count(),
    prisma.ticket.count(),
    prisma.review.count(),
    prisma.booking.aggregate({
      where: { status: 'CONFIRMED' },
      _sum: { total: true },
    }),
  ]);

  return {
    users,
    organizers,
    events,
    bookings,
    tickets,
    reviews,
    confirmedRevenue: revenue._sum.total ?? 0,
  };
}

const moderationEventSelect = { id: true, title: true, slug: true, status: true, startAt: true, endAt: true, createdAt: true, moderationNote: true, organizer: { select: { id: true, name: true, userId: true } }, _count: { select: { bookings: true, reviews: true } } };

export async function listModerationEvents(page: number, limit: number, status: EventStatus) {
  const where = { status };
  const [items, total] = await prisma.$transaction([prisma.event.findMany({ where, orderBy: { createdAt: 'asc' }, skip: (page - 1) * limit, take: limit, select: moderationEventSelect }), prisma.event.count({ where })]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function moderateEvent(id: string, moderatorId: string, action: 'approve' | 'reject', note?: string | null) {
  const event = await prisma.event.findUnique({ where: { id }, select: { id: true, status: true, organizer: { select: { userId: true } } } });
  if (!event) throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
  if (action === 'approve' && !['SUBMITTED', 'APPROVED'].includes(event.status)) throw new AppError(409, 'EVENT_NOT_APPROVABLE', 'Only submitted events can be approved.');
  if (action === 'reject' && !['SUBMITTED', 'APPROVED'].includes(event.status)) throw new AppError(409, 'EVENT_NOT_REJECTABLE', 'Only submitted events can be rejected.');
  const status = action === 'approve' ? 'PUBLISHED' : 'REJECTED';
  return prisma.$transaction(async (transaction) => {
    const updated = await transaction.event.update({ where: { id }, data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : null, moderatedAt: new Date(), moderatedById: moderatorId, moderationNote: note ?? null }, select: moderationEventSelect });
    await transaction.notification.create({ data: { userId: event.organizer.userId, type: 'EVENT_MODERATION', title: action === 'approve' ? 'Event approved' : 'Event needs changes', body: action === 'approve' ? 'Your event is now published.' : 'Your event was not approved. Review the moderation note and update it.', data: { eventId: id, status, note: note ?? null } } });
    return updated;
  });
}
