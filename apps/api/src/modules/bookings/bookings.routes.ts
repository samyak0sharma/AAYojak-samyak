import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { bookingIdSchema, bookingListQuerySchema, createBookingSchema } from './bookings.schemas.js';
import { cancelBooking, createBooking, getBooking, listBookings } from './bookings.service.js';

export const bookingsRouter = Router();
bookingsRouter.use(requireAuth);

bookingsRouter.post(
  '/',
  validate('body', createBookingSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await createBooking(request.user!.id, request.body), 201);
  }),
);

bookingsRouter.get(
  '/',
  validate('query', bookingListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number; status?: string };
    sendSuccess(response, await listBookings(request.user!.id, request.user!.role, query.page, query.limit, query.status));
  }),
);

bookingsRouter.post(
  '/:id/cancel',
  validate('params', bookingIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await cancelBooking(request.params.id as string, request.user!.id, request.user!.role));
  }),
);

bookingsRouter.get(
  '/:id',
  validate('params', bookingIdSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getBooking(request.params.id as string, request.user!.id, request.user!.role));
  }),
);
