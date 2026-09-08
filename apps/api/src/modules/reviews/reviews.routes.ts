import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { eventReviewsParamsSchema, reviewListQuerySchema } from './reviews.schemas.js';
import { listEventReviews } from './reviews.service.js';

export const reviewsRouter = Router();

reviewsRouter.get(
  '/events/:eventId/reviews',
  validate('params', eventReviewsParamsSchema),
  validate('query', reviewListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number };
    sendSuccess(response, await listEventReviews(request.params.eventId, query.page, query.limit));
  }),
);

