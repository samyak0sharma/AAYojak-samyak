import { Prisma, type BookingStatus, type UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';

const bookingSelect = {
  id: true,
  bookingNumber: true,
  status: true,
  currency: true,
  subtotal: true,
  fees: true,
  discount: true,
  total: true,
  expiresAt: true,
  confirmedAt: true,
  cancelledAt: true,
  createdAt: true,
  updatedAt: true,
  user: {
    select: { id: true, email: true, firstName: true, lastName: true },
  },
  event: {
    select: {
      id: true,
      slug: true,
      title: true,
      coverImageUrl: true,
      startAt: true,
      endAt: true,
      venueName: true,
      address: true,
      organizer: { select: { id: true, name: true, slug: true } },
    },
  },
  items: {
    select: {
      id: true,
      ticketName: true,
      quantity: true,
      unitPrice: true,
      lineTotal: true,
      ticketTier: { select: { id: true, name: true } },
    },
  },
  payments: {
    select: {
      id: true,
      provider: true,
      status: true,
      providerReference: true,
      amount: true,
      currency: true,
      initiatedAt: true,
      completedAt: true,
    },
    orderBy: { createdAt: 'desc' as const },
  },
  tickets: {
    select: {
      id: true,
      ticketCode: true,
      status: true,
      issuedAt: true,
      checkedInAt: true,
    },
  },
} satisfies Prisma.BookingSelect;

function bookingAccessWhere(userId: string, role: UserRole): Prisma.BookingWhereInput {
  if (role === 'ADMIN') {
    return {};
  }
  return {
    OR: [{ userId }, { event: { organizer: { userId } } }],
  };
}

export async function listBookings(userId: string, role: UserRole, page: number, limit: number, status?: string) {
  const skip = (page - 1) * limit;
  const where: Prisma.BookingWhereInput = {
    ...bookingAccessWhere(userId, role),
    ...(status ? { status: status as BookingStatus } : {}),
  };
  const [items, total] = await prisma.$transaction([
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: bookingSelect,
    }),
    prisma.booking.count({ where }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function getBooking(id: string, userId: string, role: UserRole) {
  const booking = await prisma.booking.findFirst({
    where: { id, ...bookingAccessWhere(userId, role) },
    select: bookingSelect,
  });
  if (!booking) {
    throw new AppError(404, 'BOOKING_NOT_FOUND', 'The requested booking was not found.');
  }
  return booking;
}

export function ticketAccessWhere(userId: string, role: UserRole): Prisma.TicketWhereInput {
  if (role === 'ADMIN') {
    return {};
  }
  return {
    booking: bookingAccessWhere(userId, role),
  };
}
