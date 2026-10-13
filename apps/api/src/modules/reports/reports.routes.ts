import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { createReport, listMyReports } from './reports.service.js';
import { reportCreateSchema, reportListQuerySchema } from './reports.schemas.js';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);
reportsRouter.post('/', validate('body', reportCreateSchema), asyncHandler(async (request, response) => sendSuccess(response, await createReport(request.user!.id, request.body), 201)));
reportsRouter.get('/mine', validate('query', reportListQuerySchema), asyncHandler(async (request, response) => { const query = request.query as unknown as { page: number; limit: number }; sendSuccess(response, await listMyReports(request.user!.id, query.page, query.limit)); }));
