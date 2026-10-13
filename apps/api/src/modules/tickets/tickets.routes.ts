import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ticketIdSchema, ticketListQuerySchema } from './tickets.schemas.js';
import { getTicket, getTicketQr, listTickets } from './tickets.service.js';
import { getTicketCheckInHistory } from '../checkins/checkins.service.js';

export const ticketsRouter = Router();
ticketsRouter.use(requireAuth);

ticketsRouter.get(
  '/',
  validate('query', ticketListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number };
    sendSuccess(response, await listTickets(request.user!.id, request.user!.role, query.page, query.limit));
  }),
);

ticketsRouter.get(
  '/:id/qr',
  validate('params', ticketIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getTicketQr(request.params.id as string, request.user!.id));
  }),
);

ticketsRouter.get(
  '/:id/check-in-history',
  validate('params', ticketIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getTicketCheckInHistory(request.params.id as string, request.user!.id, request.user!.role));
  }),
);

ticketsRouter.get(
  '/:id',
  validate('params', ticketIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getTicket(request.params.id as string, request.user!.id, request.user!.role));
  }),
);
