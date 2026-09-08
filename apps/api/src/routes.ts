import { Router } from 'express';
import { env } from './config/env.js';
import { sendSuccess } from './lib/http.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { adminRouter } from './modules/admin/admin.routes.js';
import { bookingsRouter } from './modules/bookings/bookings.routes.js';
import { categoriesRouter } from './modules/categories/categories.routes.js';
import { eventsRouter } from './modules/events/events.routes.js';
import { notificationsRouter } from './modules/notifications/notifications.routes.js';
import { organizersRouter } from './modules/organizers/organizers.routes.js';
import { reviewsRouter } from './modules/reviews/reviews.routes.js';
import { ticketsRouter } from './modules/tickets/tickets.routes.js';
import { usersRouter } from './modules/users/users.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_request, response) => {
  sendSuccess(response, {
    service: 'aayojak-api',
    status: 'ok',
    environment: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

apiRouter.use('/auth', authRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/organizers', organizersRouter);
apiRouter.use('/events', eventsRouter);
apiRouter.use('/categories', categoriesRouter);
apiRouter.use('/bookings', bookingsRouter);
apiRouter.use('/tickets', ticketsRouter);
apiRouter.use(reviewsRouter);
apiRouter.use('/notifications', notificationsRouter);
apiRouter.use('/admin', adminRouter);
