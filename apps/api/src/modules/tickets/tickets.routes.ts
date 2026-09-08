import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ticketIdSchema, ticketListQuerySchema } from './tickets.schemas.js';
import { getTicket, listTickets } from './tickets.service.js';

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
  '/:id',
  validate('params', ticketIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getTicket(request.params.id, request.user!.id, request.user!.role));
  }),
);

