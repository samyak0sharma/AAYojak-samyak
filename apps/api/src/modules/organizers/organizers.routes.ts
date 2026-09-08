import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { organizerIdSchema, organizerListQuerySchema, organizerProfileSchema, organizerEventListQuerySchema, organizerEventIdSchema, organizerEventSchema, emptyBodySchema, organizerDataQuerySchema, type OrganizerEventListQuery } from './organizers.schemas.js';
import { cancelMyEvent, createMyEvent, deleteMyDraft, getMyAnalytics, getMyEvent, getMyOrganizer, getMyRevenue, getOrganizer, getOrganizerEvents, listMyAttendees, listMyBookings, listMyEvents, listMyTickets, listOrganizers, submitMyEvent, updateMyEvent, upsertMyOrganizer } from './organizers.service.js';

export const organizersRouter = Router();
const organizerOnly = [requireAuth, requireRole('ORGANIZER')];

organizersRouter.get('/', validate('query', organizerListQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number };
  sendSuccess(response, await listOrganizers(query.page, query.limit));
}));

organizersRouter.get('/me', ...organizerOnly, asyncHandler(async (request, response) => sendSuccess(response, await getMyOrganizer(request.user!.id))));
organizersRouter.patch('/me', ...organizerOnly, validate('body', organizerProfileSchema), asyncHandler(async (request, response) => sendSuccess(response, await upsertMyOrganizer(request.user!.id, request.body))));

organizersRouter.get('/me/events', ...organizerOnly, validate('query', organizerEventListQuerySchema), asyncHandler(async (request, response) => {
  sendSuccess(response, await listMyEvents(request.user!.id, request.query as unknown as OrganizerEventListQuery));
}));
organizersRouter.post('/me/events', ...organizerOnly, validate('body', organizerEventSchema), asyncHandler(async (request, response) => {
  sendSuccess(response, await createMyEvent(request.user!.id, request.body), 201);
}));
organizersRouter.get('/me/events/:id', ...organizerOnly, validate('params', organizerEventIdSchema), asyncHandler(async (request, response) => sendSuccess(response, await getMyEvent(request.user!.id, request.params.id))));
organizersRouter.patch('/me/events/:id', ...organizerOnly, validate('params', organizerEventIdSchema), validate('body', organizerEventSchema), asyncHandler(async (request, response) => sendSuccess(response, await updateMyEvent(request.user!.id, request.params.id, request.body))));
organizersRouter.post('/me/events/:id/submit', ...organizerOnly, validate('params', organizerEventIdSchema), validate('body', emptyBodySchema), asyncHandler(async (request, response) => sendSuccess(response, await submitMyEvent(request.user!.id, request.params.id))));
organizersRouter.post('/me/events/:id/cancel', ...organizerOnly, validate('params', organizerEventIdSchema), validate('body', emptyBodySchema), asyncHandler(async (request, response) => sendSuccess(response, await cancelMyEvent(request.user!.id, request.params.id))));
organizersRouter.delete('/me/events/:id', ...organizerOnly, validate('params', organizerEventIdSchema), asyncHandler(async (request, response) => sendSuccess(response, await deleteMyDraft(request.user!.id, request.params.id))));

organizersRouter.get('/me/bookings', ...organizerOnly, validate('query', organizerDataQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number; status?: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED' | 'REFUNDED'; search?: string; eventId?: string };
  sendSuccess(response, await listMyBookings(request.user!.id, query.page, query.limit, query.status, query.search, query.eventId));
}));
organizersRouter.get('/me/attendees', ...organizerOnly, validate('query', organizerDataQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number; search?: string; eventId?: string; checkedIn?: 'true' | 'false' };
  sendSuccess(response, await listMyAttendees(request.user!.id, query.page, query.limit, query));
}));
organizersRouter.get('/me/tickets', ...organizerOnly, validate('query', organizerDataQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number };
  sendSuccess(response, await listMyTickets(request.user!.id, query.page, query.limit));
}));
organizersRouter.get('/me/analytics', ...organizerOnly, asyncHandler(async (request, response) => sendSuccess(response, await getMyAnalytics(request.user!.id))));
organizersRouter.get('/me/revenue', ...organizerOnly, asyncHandler(async (request, response) => sendSuccess(response, await getMyRevenue(request.user!.id))));

organizersRouter.get('/:id/events', validate('params', organizerIdSchema), asyncHandler(async (request, response) => sendSuccess(response, await getOrganizerEvents(request.params.id))));
organizersRouter.get('/:id', validate('params', organizerIdSchema), asyncHandler(async (request, response) => sendSuccess(response, await getOrganizer(request.params.id))));
