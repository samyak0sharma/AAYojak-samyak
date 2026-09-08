import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { notificationListQuerySchema } from './notifications.schemas.js';
import { listNotifications } from './notifications.service.js';

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get(
  '/',
  validate('query', notificationListQuerySchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { page: number; limit: number; unreadOnly: boolean };
    sendSuccess(response, await listNotifications(request.user!.id, query.page, query.limit, query.unreadOnly));
  }),
);

