import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { bookingIdSchema, bookingListQuerySchema } from './bookings.schemas.js';
import { getBooking, listBookings } from './bookings.service.js';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

bookingsRouter.get(
  '/',
  validate('query', bookingListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number; status?: string };
    sendSuccess(response, await listBookings(request.user!.id, request.user!.role, query.page, query.limit, query.status));
  }),
);

bookingsRouter.get(
  '/:id',
  validate('params', bookingIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getBooking(request.params.id, request.user!.id, request.user!.role));
  }),
);

