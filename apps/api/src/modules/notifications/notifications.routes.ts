import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { notificationIdSchema, notificationListQuerySchema } from './notifications.schemas.js';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from './notifications.service.js';

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

notificationsRouter.post('/read-all', asyncHandler(async (request, response) => {
  sendSuccess(response, await markAllNotificationsRead(request.user!.id));
}));

notificationsRouter.post('/:id/read', validate('params', notificationIdSchema), asyncHandler(async (request, response) => {
  sendSuccess(response, await markNotificationRead(request.user!.id, request.params.id as string));
}));
