import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { checkInEventParamsSchema, checkInListQuerySchema, checkInSchema } from './checkins.schemas.js';
import { checkInTicket, listCheckIns } from './checkins.service.js';

export const checkInsRouter = Router();
checkInsRouter.use(requireAuth, requireRole('ORGANIZER', 'ADMIN'));
checkInsRouter.post('/me/check-in', validate('body', checkInSchema), asyncHandler(async (request, response) => {
  sendSuccess(response, await checkInTicket(request.user!.id, request.user!.role, request.body), 201);
}));
checkInsRouter.get('/me/events/:eventId/check-ins', validate('params', checkInEventParamsSchema), validate('query', checkInListQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number; result?: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'EXPIRED' | 'INVALID' };
  sendSuccess(response, await listCheckIns(request.user!.id, request.user!.role, query.page, query.limit, request.params.eventId as string, query.result));
}));
checkInsRouter.get('/me/check-ins', validate('query', checkInListQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number; eventId?: string; result?: 'VALID' | 'ALREADY_USED' | 'CANCELLED' | 'EXPIRED' | 'INVALID' };
  sendSuccess(response, await listCheckIns(request.user!.id, request.user!.role, query.page, query.limit, query.eventId, query.result));
}));
