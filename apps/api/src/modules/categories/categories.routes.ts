import { Router } from 'express';
import { AppError, asyncHandler, sendSuccess } from '../../lib/http.js';
import { validate } from '../../middleware/validate.js';
import { categoryListQuerySchema, categorySlugSchema } from './categories.schemas.js';
import { getCategoryBySlug, listCategories } from './categories.service.js';

export const categoriesRouter = Router();

categoriesRouter.get(
  '/',
  validate('query', categoryListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number };
    const result = await listCategories(query.page, query.limit);
    sendSuccess(response, result);
  }),
);

categoriesRouter.get(
  '/:slug',
  validate('params', categorySlugSchema),
  asyncHandler(async (request, response) => {
    const category = await getCategoryBySlug(request.params.slug);
    if (!category) {
      throw new AppError(404, 'CATEGORY_NOT_FOUND', 'The requested category was not found.');
    }
    sendSuccess(response, category);
  }),
);
