import { prisma } from '../../lib/prisma.js';

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

