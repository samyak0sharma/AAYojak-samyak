import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { getAdminOverview, listModerationEvents, moderateEvent } from './admin.service.js';
import { adminEventIdSchema, adminEventListQuerySchema, adminModerationSchema } from './admin.schemas.js';
import { validate } from '../../middleware/validate.js';
import { reportIdSchema, reportListQuerySchema, reportUpdateSchema } from '../reports/reports.schemas.js';
import { listReports, updateReport } from '../reports/reports.service.js';
import { listAdminPayments, reconcileRefund, refundPayment } from '../payments/payments.service.js';
import { adminPaymentListQuerySchema, paymentIdSchema, refundIdSchema, refundPaymentSchema } from '../payments/payments.schemas.js';

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole('ADMIN'));

adminRouter.get(
  '/overview',
  asyncHandler(async (_request, response) => {
    sendSuccess(response, await getAdminOverview());
  }),
);

adminRouter.get('/reports', validate('query', reportListQuerySchema), asyncHandler(async (request, response) => { const query = request.query as unknown as { page: number; limit: number; status?: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED'; targetType?: 'EVENT' | 'ORGANIZER' | 'REVIEW' | 'USER' }; sendSuccess(response, await listReports(query.page, query.limit, query.status, query.targetType)); }));
adminRouter.patch('/reports/:id', validate('params', reportIdSchema), validate('body', reportUpdateSchema), asyncHandler(async (request, response) => sendSuccess(response, await updateReport(request.params.id as string, request.user!.id, request.body))));
adminRouter.post('/payments/:paymentId/refund', validate('params', paymentIdSchema), validate('body', refundPaymentSchema), asyncHandler(async (request, response) => sendSuccess(response, await refundPayment(request.params.paymentId as string, request.user!.id, request.body), 201)));
adminRouter.get('/payments', validate('query', adminPaymentListQuerySchema), asyncHandler(async (request, response) => { const query = request.query as unknown as { page: number; limit: number; status?: 'INITIATED' | 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED' }; sendSuccess(response, await listAdminPayments(query.page, query.limit, query.status)); }));
adminRouter.post('/refunds/:id/reconcile', validate('params', refundIdSchema), validate('body', adminModerationSchema), asyncHandler(async (request, response) => sendSuccess(response, await reconcileRefund(request.params.id as string))));

adminRouter.get('/events', validate('query', adminEventListQuerySchema), asyncHandler(async (request, response) => { const query = request.query as unknown as { page: number; limit: number; status: 'SUBMITTED' | 'APPROVED' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED' }; sendSuccess(response, await listModerationEvents(query.page, query.limit, query.status)); }));
adminRouter.post('/events/:id/approve', validate('params', adminEventIdSchema), validate('body', adminModerationSchema), asyncHandler(async (request, response) => sendSuccess(response, await moderateEvent(request.params.id as string, request.user!.id, 'approve', request.body.note))));
adminRouter.post('/events/:id/reject', validate('params', adminEventIdSchema), validate('body', adminModerationSchema), asyncHandler(async (request, response) => sendSuccess(response, await moderateEvent(request.params.id as string, request.user!.id, 'reject', request.body.note))));
