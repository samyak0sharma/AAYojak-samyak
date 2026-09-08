import { Prisma, type UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';
import { ticketAccessWhere } from '../bookings/bookings.service.js';

const ticketSelect = {
  id: true,
  ticketCode: true,
  status: true,
  issuedAt: true,
  checkedInAt: true,
  booking: {
    select: {
      id: true,
      bookingNumber: true,
      status: true,
      event: {
        select: {
          id: true,
          slug: true,
          title: true,
          startAt: true,
          endAt: true,
          venueName: true,
          address: true,
        },
      },
    },
  },
  bookingItem: {
    select: { id: true, ticketName: true, quantity: true, unitPrice: true },
  },
} satisfies Prisma.TicketSelect;

export async function listTickets(userId: string, role: UserRole, page: number, limit: number) {
  const where = ticketAccessWhere(userId, role);
  const [items, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      orderBy: { issuedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: ticketSelect,
    }),
    prisma.ticket.count({ where }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function getTicket(id: string, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({
    where: { id, ...ticketAccessWhere(userId, role) },
    select: ticketSelect,
  });
  if (!ticket) {
    throw new AppError(404, 'TICKET_NOT_FOUND', 'The requested ticket was not found.');
  }
  return ticket;
}
