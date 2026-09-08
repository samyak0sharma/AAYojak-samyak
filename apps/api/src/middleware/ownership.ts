import type { RequestHandler } from 'express';
import type { UserRole } from '@prisma/client';
import { AppError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';

export function requireOwnership(resolveOwnerId: (request: Parameters<RequestHandler>[0]) => Promise<string | undefined>): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
      return;
    }
    if (request.user.role === 'ADMIN') {
      next();
      return;
    }
    void resolveOwnerId(request)
      .then((ownerId) => {
        if (!ownerId) {
          throw new AppError(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');
        }
        if (ownerId !== request.user!.id) {
          throw new AppError(403, 'FORBIDDEN', 'You do not own this resource.');
        }
        next();
      })
      .catch(next);
  };
}

export function requireSelf(paramName = 'id'): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
      return;
    }
    if (request.params[paramName] !== request.user.id) {
      next(new AppError(403, 'FORBIDDEN', 'You can only access your own private data.'));
      return;
    }
    next();
  };
}

export async function assertOrganizerOwner(organizerId: string, userId: string, role: UserRole) {
  if (role === 'ADMIN') {
    return;
  }

  const organizer = await prisma.organizer.findUnique({
    where: { id: organizerId },
    select: { userId: true },
  });
  if (!organizer) {
    throw new AppError(404, 'ORGANIZER_NOT_FOUND', 'The requested organizer was not found.');
  }
  if (role !== 'ORGANIZER' || organizer.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this organizer resource.');
  }
}

export async function assertEventOwner(eventId: string, userId: string, role: UserRole) {
  if (role === 'ADMIN') {
    return;
  }

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { organizer: { select: { userId: true } } },
  });
  if (!event) {
    throw new AppError(404, 'EVENT_NOT_FOUND', 'The requested event was not found.');
  }
  if (role !== 'ORGANIZER' || event.organizer.userId !== userId) {
    throw new AppError(403, 'FORBIDDEN', 'You do not own this event.');
  }
}
