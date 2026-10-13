import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { eventListQuerySchema, eventSlugSchema, relatedEventQuerySchema, type EventListQuery } from './events.schemas.js';
import { getEventBySlug, getRelatedEvents, listEvents } from './events.service.js';

export const eventsRouter = Router();

eventsRouter.get(
  '/',
  validate('query', eventListQuerySchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await listEvents(request.query as unknown as EventListQuery));
  }),
);

eventsRouter.get(
  '/:slug/related',
  validate('params', eventSlugSchema),
  validate('query', relatedEventQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { limit: number };
    sendSuccess(response, await getRelatedEvents(request.params.slug as string, query.limit));
  }),
);

eventsRouter.get(
  '/:slug',
  validate('params', eventSlugSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await getEventBySlug(request.params.slug as string));
  }),
);
