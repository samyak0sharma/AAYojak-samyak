import { createHash } from 'node:crypto';
import { Prisma, type CheckInResult, type UserRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { AppError, pagination } from '../../lib/http.js';

const checkInSelect = {
  id: true, result: true, scannedAt: true, notes: true,
  ticket: { select: {
    id: true, ticketCode: true, status: true, checkedInAt: true,
    booking: { select: {
      id: true, bookingNumber: true, status: true,
      event: { select: { id: true, title: true, startAt: true, endAt: true } },
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    } },
    bookingItem: { select: { ticketName: true, ticketTier: { select: { name: true } } } },
  } },
  checker: { select: { id: true, firstName: true, lastName: true, email: true } },
} satisfies Prisma.CheckInSelect;

function ownerEventWhere(userId: string, role: UserRole): Prisma.EventWhereInput {
  return role === 'ADMIN' ? {} : { organizer: { userId } };
}

function tokenFromPayload(payload: string) {
  const match = /^aayojak:v1:([A-Za-z0-9_-]{32,128})$/.exec(payload);
  return match?.[1];
}

async function checkInTransaction(userId: string, role: UserRole, input: { payload?: string; ticketCode?: string; eventId?: string }) {
  return prisma.$transaction(async (tx) => {
    let ticket = input.ticketCode
      ? await tx.ticket.findUnique({ where: { ticketCode: input.ticketCode }, select: { id: true, validationTokenHash: true } })
      : undefined;
    if (!ticket && input.payload) {
      const token = tokenFromPayload(input.payload);
      if (token) ticket = await tx.ticket.findUnique({ where: { validationTokenHash: createHash('sha256').update(token).digest('hex') }, select: { id: true, validationTokenHash: true } }) ?? undefined;
    }
    if (!ticket) throw new AppError(422, 'INVALID_QR_PAYLOAD', 'This QR payload or ticket code is invalid.');

    // Lock the ticket row before evaluating or changing check-in state.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Ticket" WHERE "id" = ${ticket.id}::uuid FOR UPDATE`);
    const fullTicket = await tx.ticket.findUnique({ where: { id: ticket.id }, select: {
      id: true, ticketCode: true, status: true, checkedInAt: true,
      booking: { select: { id: true, status: true, event: { select: { id: true, title: true, status: true, startAt: true, endAt: true, organizer: { select: { userId: true } } } }, user: { select: { id: true, firstName: true, lastName: true, email: true } } } },
      bookingItem: { select: { ticketName: true, ticketTier: { select: { name: true } } } },
    } });
    if (!fullTicket) throw new AppError(404, 'TICKET_NOT_FOUND', 'The ticket was not found.');
    if (role !== 'ADMIN' && fullTicket.booking.event.organizer.userId !== userId) throw new AppError(403, 'FORBIDDEN', 'You do not own this event.');
    if (input.eventId && input.eventId !== fullTicket.booking.event.id) {
      const checkIn = await tx.checkIn.create({ data: { ticketId: fullTicket.id, checkerId: userId, result: 'INVALID', notes: 'Ticket belongs to another event.' }, select: checkInSelect });
      return { accepted: false, reason: 'WRONG_EVENT', checkIn };
    }

    let result: CheckInResult = 'VALID';
    let notes: string | undefined;
    if (fullTicket.booking.event.status === 'CANCELLED') { result = 'CANCELLED'; notes = 'The event was cancelled.'; }
    else if (fullTicket.booking.status !== 'CONFIRMED') { result = 'INVALID'; notes = 'Booking is not confirmed.'; }
    else if (fullTicket.status === 'CANCELLED') { result = 'CANCELLED'; notes = 'Ticket is cancelled.'; }
    else if (fullTicket.status === 'EXPIRED' || fullTicket.booking.event.endAt <= new Date()) { result = 'EXPIRED'; notes = 'Ticket is expired.'; }
    else if (fullTicket.status === 'USED' || fullTicket.checkedInAt) { result = 'ALREADY_USED'; notes = 'Ticket was already checked in.'; }

    if (result === 'VALID') {
      const now = new Date();
      await tx.ticket.update({ where: { id: fullTicket.id }, data: { status: 'USED', checkedInAt: now } });
      const checkIn = await tx.checkIn.create({ data: { ticketId: fullTicket.id, checkerId: userId, result, scannedAt: now }, select: checkInSelect });
      return { accepted: true, checkIn };
    }
    if (result === 'EXPIRED' && fullTicket.status === 'ISSUED') await tx.ticket.update({ where: { id: fullTicket.id }, data: { status: 'EXPIRED' } });
    const checkIn = await tx.checkIn.create({ data: { ticketId: fullTicket.id, checkerId: userId, result, notes }, select: checkInSelect });
    return { accepted: false, checkIn };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function checkInTicket(userId: string, role: UserRole, input: { payload?: string; ticketCode?: string; eventId?: string }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await checkInTransaction(userId, role, input);
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  throw new AppError(409, 'CHECK_IN_CONFLICT', 'The ticket was being checked in concurrently. Please scan it again.');
}

export async function listCheckIns(userId: string, role: UserRole, page: number, limit: number, eventId?: string, result?: CheckInResult) {
  const where: Prisma.CheckInWhereInput = { ticket: { booking: { event: { ...ownerEventWhere(userId, role), ...(eventId ? { id: eventId } : {}) } } }, ...(result ? { result } : {}) };
  const [items, total] = await prisma.$transaction([
    prisma.checkIn.findMany({ where, orderBy: { scannedAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: checkInSelect }),
    prisma.checkIn.count({ where }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function getTicketCheckInHistory(ticketId: string, userId: string, role: UserRole) {
  const ticket = await prisma.ticket.findFirst({ where: { id: ticketId, OR: [{ booking: { userId } }, { booking: { event: ownerEventWhere(userId, role) } }] }, select: { id: true } });
  if (!ticket) throw new AppError(404, 'TICKET_NOT_FOUND', 'The requested ticket was not found.');
  return prisma.checkIn.findMany({ where: { ticketId }, orderBy: { scannedAt: 'desc' }, select: checkInSelect });
}
