import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { eventReviewsParamsSchema, reviewCreateSchema, reviewListQuerySchema } from './reviews.schemas.js';
import { createReview, listEventReviews } from './reviews.service.js';

export const reviewsRouter = Router();

reviewsRouter.get(
  '/events/:eventId/reviews',
  validate('params', eventReviewsParamsSchema),
  validate('query', reviewListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number };
    sendSuccess(response, await listEventReviews(request.params.eventId as string, query.page, query.limit));
  }),
);

reviewsRouter.post(
  '/events/:eventId/reviews',
  requireAuth,
  validate('params', eventReviewsParamsSchema),
  validate('body', reviewCreateSchema),
  asyncHandler(async (request, response) => sendSuccess(response, await createReview(request.user!.id, request.params.eventId as string, request.body), 201)),
);
