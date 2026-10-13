import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { env } from '../../config/env.js';
import { handleEsewaCallback, handleKhaltiCallback, initiatePayment } from './payments.service.js';
import { khaltiCallbackSchema, paymentBookingIdSchema, paymentProviderSchema } from './payments.schemas.js';

export const paymentsRouter = Router();
paymentsRouter.post('/:bookingId/initiate', requireAuth, validate('params', paymentBookingIdSchema), validate('body', paymentProviderSchema), asyncHandler(async (request, response) => {
  sendSuccess(response, await initiatePayment(request.params.bookingId as string, request.user!.id, request.user!.role, request.body.provider));
}));

paymentsRouter.get('/khalti/callback', validate('query', khaltiCallbackSchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as Record<string, string | undefined>;
  const bookingId = await handleKhaltiCallback(query);
  response.redirect(`${env.FRONTEND_URL}/bookings/${bookingId}?payment=success`);
}));

paymentsRouter.get('/esewa/success', asyncHandler(async (request, response) => {
  const bookingId = await handleEsewaCallback(typeof request.query.data === 'string' ? request.query.data : undefined);
  response.redirect(`${env.FRONTEND_URL}/bookings/${bookingId}?payment=success`);
}));

paymentsRouter.get('/esewa/failure', (_request, response) => {
  response.redirect(`${env.FRONTEND_URL}/dashboard?payment=failed`);
});
