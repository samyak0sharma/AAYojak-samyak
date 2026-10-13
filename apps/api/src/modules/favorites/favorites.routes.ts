import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { addFavorite, listFavorites, removeFavorite } from './favorites.service.js';
import { favoriteEventParamsSchema, favoriteEventSchema, favoriteListQuerySchema } from './favorites.schemas.js';

export const favoritesRouter = Router();
favoritesRouter.use(requireAuth);
favoritesRouter.get('/', validate('query', favoriteListQuerySchema), asyncHandler(async (request, response) => {
  const query = request.query as unknown as { page: number; limit: number };
  sendSuccess(response, await listFavorites(request.user!.id, query.page, query.limit));
}));
favoritesRouter.post('/', validate('body', favoriteEventSchema), asyncHandler(async (request, response) => sendSuccess(response, await addFavorite(request.user!.id, request.body.eventId), 201)));
favoritesRouter.delete('/:eventId', validate('params', favoriteEventParamsSchema), asyncHandler(async (request, response) => sendSuccess(response, await removeFavorite(request.user!.id, request.params.eventId as string))));
