import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getAdminOverview } from './admin.service.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get(
  '/overview',
  asyncHandler(async (_request, response) => {
    sendSuccess(response, await getAdminOverview());
  }),
);

