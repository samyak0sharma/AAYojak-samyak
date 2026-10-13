import { z } from 'zod';

export const paymentBookingIdSchema = z.object({ bookingId: z.string().uuid() });
export const paymentProviderSchema = z.object({ provider: z.enum(['KHALTI', 'ESEWA']) });
export const khaltiCallbackSchema = z.object({ pidx: z.string().optional(), purchase_order_id: z.string().optional(), status: z.string().optional() });
export const refundPaymentSchema = z.object({ amount: z.coerce.number().positive().finite().optional(), reason: z.string().trim().min(3).max(500) });
export const paymentIdSchema = z.object({ paymentId: z.string().uuid() });
export const refundIdSchema = z.object({ id: z.string().uuid() });
export const adminPaymentListQuerySchema = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(25), status: z.enum(['INITIATED', 'PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED']).optional() });
