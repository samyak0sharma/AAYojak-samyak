import { Prisma, type BookingStatus, type UserRole } from '@prisma/client';
import { createHash, randomBytes } from 'node:crypto';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';
import type { z } from 'zod';
import type { createBookingSchema } from './bookings.schemas.js';

type CreateBookingInput = z.infer<typeof createBookingSchema>;

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

function bookingNumber() {
  return `AYK-${Date.now().toString(36).toUpperCase()}-${randomBytes(4).toString('hex').toUpperCase()}`;
}

function ticketCode() {
  return `AYK-${randomBytes(10).toString('hex').toUpperCase()}`;
}

function validationToken() {
  const token = randomBytes(32).toString('base64url');
  return { token, hash: createHash('sha256').update(token).digest('hex') };
}

function normalizeItems(input: CreateBookingInput) {
  const grouped = new Map<string | undefined, number>();
  for (const item of input.items) grouped.set(item.ticketTierId, (grouped.get(item.ticketTierId) ?? 0) + item.quantity);
  return Array.from(grouped, ([ticketTierId, quantity]) => ({ ticketTierId, quantity }));
}

export async function createBooking(userId: string, input: CreateBookingInput) {
  const items = normalizeItems(input);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Event" WHERE "id" = ${input.eventId}::uuid FOR UPDATE`);
    const event = await tx.event.findFirst({
      where: { id: input.eventId, status: 'PUBLISHED', organizer: { isApproved: true } },
      select: { id: true, title: true, eventType: true, capacity: true, startAt: true },
    });
    if (!event) throw new AppError(404, 'EVENT_NOT_BOOKABLE', 'This event is not available for booking.');
    if (event.startAt <= new Date()) throw new AppError(409, 'EVENT_STARTED', 'Bookings are closed after an event has started.');

    const duplicate = await tx.booking.findFirst({ where: { userId, eventId: event.id, status: { in: ['PENDING', 'CONFIRMED'] } }, select: { id: true, status: true, expiresAt: true, items: { select: { ticketTierId: true, quantity: true } } } });
    if (duplicate?.status === 'PENDING' && duplicate.expiresAt && duplicate.expiresAt <= new Date()) {
      await tx.booking.update({ where: { id: duplicate.id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
      for (const item of duplicate.items) if (item.ticketTierId) await tx.ticketTier.update({ where: { id: item.ticketTierId }, data: { reservedQuantity: { decrement: item.quantity } } });
      await tx.payment.updateMany({ where: { bookingId: duplicate.id, status: 'INITIATED' }, data: { status: 'CANCELLED' } });
    } else if (duplicate) {
      throw new AppError(409, 'BOOKING_ALREADY_EXISTS', 'You already have an active booking for this event.');
    }

    const tierIds = items.flatMap(({ ticketTierId }) => ticketTierId ? [ticketTierId] : []);
    if (event.eventType === 'FREE' && tierIds.length) throw new AppError(422, 'FREE_EVENT_TIER_INVALID', 'Free events do not accept paid ticket tiers.');
    if (event.eventType === 'PAID' && tierIds.length !== items.length) throw new AppError(422, 'TICKET_TIER_REQUIRED', 'Select a ticket tier for every paid booking item.');

    const tiers = tierIds.length ? await tx.ticketTier.findMany({ where: { eventId: event.id, id: { in: tierIds }, isActive: true }, orderBy: { price: 'asc' } }) : [];
    if (tiers.length !== tierIds.length) throw new AppError(422, 'TICKET_TIER_INVALID', 'One or more selected ticket tiers are unavailable.');
    const tierById = new Map(tiers.map((tier) => [tier.id, tier]));
    const now = new Date();
    const normalized = items.map((item) => {
      const tier = item.ticketTierId ? tierById.get(item.ticketTierId) : undefined;
      if (tier && ((tier.saleStartAt && tier.saleStartAt > now) || (tier.saleEndAt && tier.saleEndAt < now))) throw new AppError(409, 'TICKET_SALE_CLOSED', `Sales for ${tier.name} are not open.`);
      return { ...item, tier };
    });
    const totalQuantity = normalized.reduce((sum, item) => sum + item.quantity, 0);
    if (event.capacity !== null) {
      const confirmed = await tx.bookingItem.aggregate({ where: { booking: { eventId: event.id, status: { in: ['PENDING', 'CONFIRMED'] } } }, _sum: { quantity: true } });
      if ((confirmed._sum.quantity ?? 0) + totalQuantity > event.capacity) throw new AppError(409, 'EVENT_CAPACITY_EXCEEDED', 'There are not enough places remaining for this event.');
    }

    for (const item of normalized) {
      if (!item.tier) continue;
      const available = item.tier.quantity - item.tier.reservedQuantity - item.tier.soldQuantity;
      if (available < item.quantity) throw new AppError(409, 'TICKET_QUANTITY_UNAVAILABLE', `Only ${Math.max(available, 0)} ${item.tier.name} ticket(s) remain.`);
    }
    const isFree = event.eventType === 'FREE';
    const currency = normalized.find((item) => item.tier)?.tier?.currency ?? 'NPR';
    if (normalized.some((item) => item.tier && item.tier.currency !== currency)) throw new AppError(422, 'MIXED_CURRENCIES', 'A booking cannot contain multiple currencies.');
    const subtotal = normalized.reduce((sum, item) => sum + (item.tier ? Number(item.tier.price) * item.quantity : 0), 0);
    const booking = await tx.booking.create({
      data: {
        bookingNumber: bookingNumber(), userId, eventId: event.id, status: isFree ? 'CONFIRMED' : 'PENDING', currency,
        subtotal, fees: 0, discount: 0, total: subtotal, confirmedAt: isFree ? now : null,
        expiresAt: isFree ? null : new Date(now.getTime() + 15 * 60 * 1_000),
        items: { create: normalized.map((item) => ({ ticketTierId: item.ticketTierId ?? null, ticketName: item.tier?.name ?? 'General admission', quantity: item.quantity, unitPrice: item.tier?.price ?? 0, lineTotal: item.tier ? Number(item.tier.price) * item.quantity : 0 })) },
      },
      select: { id: true, items: true },
    });
    if (!isFree) {
      for (const item of normalized) if (item.tier) await tx.ticketTier.update({ where: { id: item.tier.id }, data: { reservedQuantity: { increment: item.quantity } } });
      await tx.payment.create({ data: { bookingId: booking.id, provider: 'OTHER', status: 'INITIATED', amount: subtotal, currency, metadata: { paymentProvider: 'not_configured' } } });
    } else await issueTickets(tx, booking.id);
    return getBookingFromTransaction(tx, booking.id);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function issueTickets(tx: Prisma.TransactionClient, bookingId: string) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true } });
  if (!booking || booking.status !== 'CONFIRMED') return;
  const items = await tx.bookingItem.findMany({ where: { bookingId }, select: { id: true, quantity: true, _count: { select: { tickets: true } } } });
  for (const item of items) for (let index = item._count.tickets; index < item.quantity; index += 1) {
    const token = validationToken();
    await tx.ticket.create({ data: { bookingId, bookingItemId: item.id, ticketCode: ticketCode(), validationTokenHash: token.hash, qrPayload: `aayojak:v1:${token.token}` } });
  }
}

async function getBookingFromTransaction(tx: Prisma.TransactionClient, id: string) {
  return tx.booking.findUniqueOrThrow({ where: { id }, select: bookingSelect });
}

export async function cancelBooking(id: string, userId: string, role: UserRole) {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findFirst({ where: { id, ...bookingAccessWhere(userId, role) }, select: { id: true, status: true, items: { select: { ticketTierId: true, quantity: true } } } });
    if (!booking) throw new AppError(404, 'BOOKING_NOT_FOUND', 'The requested booking was not found.');
    if (!['PENDING', 'CONFIRMED'].includes(booking.status)) throw new AppError(409, 'BOOKING_NOT_CANCELLABLE', 'This booking can no longer be cancelled.');
    await tx.booking.update({ where: { id }, data: { status: 'CANCELLED', cancelledAt: new Date() } });
    if (booking.status === 'PENDING') for (const item of booking.items) if (item.ticketTierId) await tx.ticketTier.update({ where: { id: item.ticketTierId }, data: { reservedQuantity: { decrement: item.quantity } } });
    if (booking.status === 'PENDING') await tx.payment.updateMany({ where: { bookingId: id, status: 'INITIATED' }, data: { status: 'CANCELLED' } });
    if (booking.status === 'CONFIRMED') await tx.ticket.updateMany({ where: { bookingId: id }, data: { status: 'CANCELLED' } });
    return getBookingFromTransaction(tx, id);
  });
}

/** Releases expired reservations so capacity and ticket-tier inventory recover without a user request. */
export async function expirePendingBookings(now = new Date()) {
  const expired = await prisma.booking.findMany({
    where: { status: 'PENDING', expiresAt: { lte: now } },
    select: { id: true },
    orderBy: { expiresAt: 'asc' },
    take: 100,
  });
  let expiredCount = 0;
  for (const candidate of expired) {
    const changed = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Booking" WHERE "id" = ${candidate.id}::uuid FOR UPDATE`);
      const booking = await tx.booking.findUnique({
        where: { id: candidate.id },
        select: { status: true, expiresAt: true, items: { select: { ticketTierId: true, quantity: true } } },
      });
      if (!booking || booking.status !== 'PENDING' || !booking.expiresAt || booking.expiresAt > now) return false;
      await tx.booking.update({ where: { id: candidate.id }, data: { status: 'CANCELLED', cancelledAt: now } });
      await tx.payment.updateMany({ where: { bookingId: candidate.id, status: { in: ['INITIATED', 'PENDING'] } }, data: { status: 'CANCELLED' } });
      for (const item of booking.items) {
        if (item.ticketTierId) await tx.ticketTier.update({ where: { id: item.ticketTierId }, data: { reservedQuantity: { decrement: item.quantity } } });
      }
      return true;
    });
    if (changed) expiredCount += 1;
  }
  return expiredCount;
}

export function ticketAccessWhere(userId: string, role: UserRole): Prisma.TicketWhereInput {
  if (role === 'ADMIN') {
    return {};
  }
  return {
    booking: bookingAccessWhere(userId, role),
  };
}
