import { createHmac, timingSafeEqual } from 'node:crypto';
import { Prisma, type PaymentProvider, type PaymentStatus, type UserRole } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError, pagination } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { issueTickets } from '../bookings/bookings.service.js';

type ProviderName = 'KHALTI' | 'ESEWA';

function providerConfig(provider: ProviderName) {
  if (env.PAYMENT_PROVIDER !== provider.toLowerCase()) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', `${provider} payments are not configured on this server.`);
  if (provider === 'KHALTI' && !env.KHALTI_SECRET_KEY) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Khalti payments are not configured on this server.');
  if (provider === 'ESEWA' && !env.ESEWA_SECRET_KEY) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'eSewa payments are not configured on this server.');
}

async function ownedPendingPayment(bookingId: string, userId: string, role: UserRole) {
  const payment = await prisma.payment.findFirst({
    where: { bookingId, status: 'INITIATED', ...(role === 'ADMIN' ? {} : { booking: { userId } }) },
    select: { id: true, provider: true, amount: true, currency: true, booking: { select: { id: true, bookingNumber: true, status: true, expiresAt: true, event: { select: { title: true } }, user: { select: { firstName: true, lastName: true, email: true } } } } },
  });
  if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The pending payment was not found.');
  if (payment.booking.status !== 'PENDING' || !payment.booking.expiresAt || payment.booking.expiresAt <= new Date()) throw new AppError(409, 'BOOKING_NOT_PAYABLE', 'This booking is no longer available for payment.');
  return payment;
}

async function providerRequest(url: string, init: RequestInit) {
  let response: Response;
  try { response = await fetch(url, init); } catch { throw new AppError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'The payment provider could not be reached.'); }
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new AppError(502, 'PAYMENT_PROVIDER_REJECTED', 'The payment provider rejected the request.', payload);
  return payload ?? {};
}

export async function initiatePayment(bookingId: string, userId: string, role: UserRole, provider: ProviderName) {
  providerConfig(provider);
  const payment = await ownedPendingPayment(bookingId, userId, role);
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError(422, 'INVALID_PAYMENT_AMOUNT', 'This booking has no payable amount.');

  const existing = await prisma.payment.findFirst({
    where: { bookingId, provider, status: 'INITIATED', providerReference: { not: null } },
    select: { metadata: true },
  });
  const existingRedirect = existing?.metadata && typeof existing.metadata === 'object' && !Array.isArray(existing.metadata) && typeof (existing.metadata as Record<string, unknown>).redirectUrl === 'string'
    ? (existing.metadata as Record<string, unknown>).redirectUrl as string
    : undefined;
  if (existingRedirect) return { provider, redirectUrl: existingRedirect };

  if (provider === 'KHALTI') {
    const payload = await providerRequest(`${env.KHALTI_BASE_URL.replace(/\/$/, '')}/epayment/initiate/`, {
      method: 'POST', headers: { Authorization: `Key ${env.KHALTI_SECRET_KEY!}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ return_url: `${env.API_URL}/api/payments/khalti/callback`, website_url: env.FRONTEND_URL, amount: Math.round(amount * 100), purchase_order_id: payment.booking.bookingNumber, purchase_order_name: payment.booking.event.title, customer_info: { name: `${payment.booking.user.firstName} ${payment.booking.user.lastName}`, email: payment.booking.user.email } }),
    });
    if (typeof payload.pidx !== 'string' || typeof payload.payment_url !== 'string') throw new AppError(502, 'PAYMENT_PROVIDER_INVALID_RESPONSE', 'Khalti returned an invalid initiation response.');
    await prisma.payment.update({ where: { id: payment.id }, data: { provider: 'KHALTI', providerReference: payload.pidx, metadata: { pidx: payload.pidx, expiresAt: payload.expires_at ?? null, redirectUrl: payload.payment_url } } });
    return { provider, redirectUrl: payload.payment_url };
  }

  const transactionUuid = payment.booking.bookingNumber;
  const totalAmount = amount.toFixed(2);
  const signedFieldNames = 'total_amount,transaction_uuid,product_code';
  const signature = signEsewa({ total_amount: totalAmount, transaction_uuid: transactionUuid, product_code: env.ESEWA_PRODUCT_CODE! }, signedFieldNames);
  await prisma.payment.update({ where: { id: payment.id }, data: { provider: 'ESEWA', providerReference: transactionUuid, metadata: { transactionUuid, productCode: env.ESEWA_PRODUCT_CODE! } as Prisma.InputJsonValue } });
  return { provider, redirectUrl: env.ESEWA_BASE_URL!, form: { amount: totalAmount, tax_amount: '0', total_amount: totalAmount, transaction_uuid: transactionUuid, product_code: env.ESEWA_PRODUCT_CODE!, product_service_charge: '0', product_delivery_charge: '0', success_url: `${env.API_URL}/api/payments/esewa/success`, failure_url: `${env.API_URL}/api/payments/esewa/failure`, signed_field_names: signedFieldNames, signature } };
}

function signEsewa(values: Record<string, string>, signedFieldNames: string) {
  const message = signedFieldNames.split(',').map((field) => `${field}=${values[field] ?? ''}`).join(',');
  return createHmac('sha256', env.ESEWA_SECRET_KEY ?? '').update(message).digest('base64');
}

function validSignature(values: Record<string, string>, signature: string) {
  const expected = signEsewa(values, values.signed_field_names ?? '');
  const expectedBuffer = Buffer.from(expected); const receivedBuffer = Buffer.from(signature);
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

async function releaseFailedPayment(tx: Prisma.TransactionClient, paymentId: string, bookingId: string, status: PaymentStatus) {
  const booking = await tx.booking.findUnique({ where: { id: bookingId }, select: { status: true, items: { select: { ticketTierId: true, quantity: true } } } });
  if (!booking || booking.status !== 'PENDING') return;
  await tx.booking.update({ where: { id: bookingId }, data: { status: 'FAILED', cancelledAt: new Date() } });
  await tx.payment.update({ where: { id: paymentId }, data: { status } });
  for (const item of booking.items) if (item.ticketTierId) await tx.ticketTier.update({ where: { id: item.ticketTierId }, data: { reservedQuantity: { decrement: item.quantity } } });
}

async function confirmPayment(paymentId: string, provider: PaymentProvider, providerReference: string, paidAmount: number, metadata: Record<string, unknown>) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, select: { id: true, amount: true, status: true, bookingId: true, booking: { select: { status: true, expiresAt: true, items: { select: { ticketTierId: true, quantity: true } } } } } });
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The payment record was not found.');
    if (payment.status === 'COMPLETED') return payment.bookingId;
    if (payment.status !== 'INITIATED' || payment.booking.status !== 'PENDING' || !payment.booking.expiresAt || payment.booking.expiresAt <= new Date()) { await releaseFailedPayment(tx, payment.id, payment.bookingId, 'CANCELLED'); throw new AppError(409, 'BOOKING_NOT_PAYABLE', 'This booking is no longer available for payment.'); }
    if (!Number.isFinite(paidAmount) || Math.abs(Number(payment.amount) - paidAmount) > 0.01) { await releaseFailedPayment(tx, payment.id, payment.bookingId, 'FAILED'); throw new AppError(409, 'PAYMENT_AMOUNT_MISMATCH', 'The verified payment amount does not match the booking.'); }
    await tx.payment.update({ where: { id: payment.id }, data: { provider, providerReference, status: 'COMPLETED', completedAt: new Date(), metadata: metadata as Prisma.InputJsonValue } });
    await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'CONFIRMED', confirmedAt: new Date(), expiresAt: null } });
    for (const item of payment.booking.items) if (item.ticketTierId) await tx.ticketTier.update({ where: { id: item.ticketTierId }, data: { reservedQuantity: { decrement: item.quantity }, soldQuantity: { increment: item.quantity } } });
    await issueTickets(tx, payment.bookingId);
    return payment.bookingId;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function confirmPaymentWithRetry(paymentId: string, provider: PaymentProvider, providerReference: string, paidAmount: number, metadata: Record<string, unknown>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await confirmPayment(paymentId, provider, providerReference, paidAmount, metadata); }
    catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 2) throw error;
    }
  }
  throw new AppError(409, 'PAYMENT_CONFLICT', 'The payment was being finalized concurrently. Please try again.');
}

export async function handleKhaltiCallback(query: Record<string, string | undefined>) {
  providerConfig('KHALTI');
  if (!query.pidx || !query.purchase_order_id) throw new AppError(400, 'INVALID_PAYMENT_CALLBACK', 'The Khalti callback is missing required parameters.');
  const payment = await prisma.payment.findFirst({ where: { provider: 'KHALTI', providerReference: query.pidx, booking: { bookingNumber: query.purchase_order_id } }, select: { id: true, bookingId: true } });
  if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The Khalti payment could not be matched to a booking.');
  const payload = await providerRequest(`${env.KHALTI_BASE_URL.replace(/\/$/, '')}/epayment/lookup/`, { method: 'POST', headers: { Authorization: `Key ${env.KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ pidx: query.pidx }) });
  const status = typeof payload.status === 'string' ? payload.status : '';
  if (status !== 'Completed') { await prisma.$transaction((tx) => releaseFailedPayment(tx, payment.id, payment.bookingId, status === 'Expired' || status === 'User canceled' ? 'CANCELLED' : 'FAILED')); return query.purchase_order_id; }
  return confirmPaymentWithRetry(payment.id, 'KHALTI', typeof payload.transaction_id === 'string' ? payload.transaction_id : query.pidx, Number(payload.total_amount) / 100, { pidx: query.pidx, lookup: payload });
}

export async function handleEsewaCallback(encoded: string | undefined) {
  providerConfig('ESEWA');
  if (!encoded) throw new AppError(400, 'INVALID_PAYMENT_CALLBACK', 'The eSewa callback is missing payment data.');
  let data: Record<string, string>;
  try { data = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8')) as Record<string, string>; } catch { throw new AppError(400, 'INVALID_PAYMENT_CALLBACK', 'The eSewa callback data is invalid.'); }
  if (!data.signature || !data.signed_field_names || !validSignature(data, data.signature)) throw new AppError(400, 'INVALID_PAYMENT_SIGNATURE', 'The eSewa payment signature could not be verified.');
  const transactionUuid = data.transaction_uuid; const totalAmount = data.total_amount; const statusUrl = env.ESEWA_STATUS_URL; const productCode = env.ESEWA_PRODUCT_CODE;
  if (!transactionUuid || !totalAmount || !statusUrl || !productCode) throw new AppError(400, 'INVALID_PAYMENT_CALLBACK', 'The eSewa payment callback is missing required fields.');
  const payment = await prisma.payment.findFirst({ where: { provider: 'ESEWA', providerReference: transactionUuid }, select: { id: true, amount: true, bookingId: true } });
  if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The eSewa payment could not be matched to a booking.');
  const statusResponse = await providerRequest(`${statusUrl}?product_code=${encodeURIComponent(productCode)}&total_amount=${encodeURIComponent(totalAmount)}&transaction_uuid=${encodeURIComponent(transactionUuid)}`, { method: 'GET' });
  if (statusResponse.status !== 'COMPLETE' || Number(statusResponse.total_amount) !== Number(payment.amount)) { await prisma.$transaction((tx) => releaseFailedPayment(tx, payment.id, payment.bookingId, 'FAILED')); return transactionUuid; }
  return confirmPaymentWithRetry(payment.id, 'ESEWA', typeof data.transaction_code === 'string' ? data.transaction_code : transactionUuid, Number(totalAmount), { response: data, status: statusResponse });
}

const refundSelect = { id: true, paymentId: true, amount: true, currency: true, status: true, providerReference: true, reason: true, failureReason: true, requestedAt: true, completedAt: true } satisfies Prisma.RefundSelect;

const adminPaymentSelect = { id: true, provider: true, status: true, providerReference: true, amount: true, currency: true, completedAt: true, booking: { select: { id: true, bookingNumber: true, event: { select: { id: true, title: true } }, user: { select: { firstName: true, lastName: true, email: true } } } }, refunds: { orderBy: { createdAt: 'desc' as const }, select: refundSelect } } satisfies Prisma.PaymentSelect;

export async function listAdminPayments(page: number, limit: number, status?: PaymentStatus) {
  const where = status ? { status } : {};
  const [items, total] = await prisma.$transaction([
    prisma.payment.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit, select: adminPaymentSelect }),
    prisma.payment.count({ where }),
  ]);
  return { items, pagination: pagination(page, limit, total) };
}

export async function refundPayment(paymentId: string, adminId: string, input: { amount?: number; reason: string }) {
  const refund = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Payment" WHERE "id" = ${paymentId}::uuid FOR UPDATE`);
    const payment = await tx.payment.findUnique({ where: { id: paymentId }, select: { id: true, provider: true, providerReference: true, status: true, amount: true, currency: true, refunds: { where: { status: { in: ['REQUESTED', 'PROCESSING', 'SUCCEEDED'] } }, select: { amount: true, status: true } } } });
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'The requested payment was not found.');
    if (payment.status !== 'COMPLETED' || !payment.providerReference) throw new AppError(409, 'PAYMENT_NOT_REFUNDABLE', 'Only completed provider payments can be refunded.');
    if (payment.provider === 'KHALTI' && !env.KHALTI_SECRET_KEY) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Khalti refund credentials are not configured.');
    if (payment.refunds.some((item) => item.status === 'REQUESTED' || item.status === 'PROCESSING')) throw new AppError(409, 'REFUND_IN_PROGRESS', 'A refund is already being processed for this payment.');
    const alreadyRefunded = payment.refunds.filter((item) => item.status === 'SUCCEEDED').reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = Number(payment.amount) - alreadyRefunded;
    const amount = input.amount ?? remaining;
    if (!Number.isFinite(amount) || amount <= 0 || amount > remaining + 0.001) throw new AppError(422, 'REFUND_AMOUNT_INVALID', 'The refund amount exceeds the remaining refundable payment amount.');
    const created = await tx.refund.create({ data: { paymentId: payment.id, requestedById: adminId, amount: amount.toFixed(2), currency: payment.currency, reason: input.reason }, select: refundSelect });
    return { refund: created, fullRefund: amount >= remaining - 0.001 };
  });

  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: paymentId }, select: { provider: true, providerReference: true, amount: true, bookingId: true } });
  if (payment.provider !== 'KHALTI') {
    return prisma.refund.update({ where: { id: refund.refund.id }, data: { status: 'MANUAL_REQUIRED', failureReason: 'This provider requires refund processing through its merchant operations flow.' }, select: refundSelect });
  }
  if (!env.KHALTI_SECRET_KEY || !payment.providerReference) throw new AppError(503, 'PAYMENT_PROVIDER_NOT_CONFIGURED', 'Khalti refund credentials are not configured.');
  await prisma.refund.update({ where: { id: refund.refund.id }, data: { status: 'PROCESSING' } });
  const requestedAmount = Number(refund.refund.amount); const fullRefund = refund.fullRefund;
  let response: Response;
  try {
    response = await fetch(`${env.KHALTI_REFUND_BASE_URL.replace(/\/$/, '')}/${encodeURIComponent(payment.providerReference)}/refund/`, { method: 'POST', headers: { Authorization: `Key ${env.KHALTI_SECRET_KEY}`, 'Content-Type': 'application/json' }, body: fullRefund ? '{}' : JSON.stringify({ amount: Math.round(requestedAmount * 100) }) });
  } catch {
    // The provider may have accepted the request before the connection failed.
    // Keep this refund out of automatic retries until an operator reconciles it.
    await prisma.refund.update({ where: { id: refund.refund.id }, data: { status: 'MANUAL_REQUIRED', failureReason: 'Khalti response was unavailable; reconcile the provider transaction before retrying.' } });
    throw new AppError(502, 'REFUND_RECONCILIATION_REQUIRED', 'The provider response was unavailable; this refund requires reconciliation before retrying.');
  }
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    await prisma.refund.update({ where: { id: refund.refund.id }, data: { status: 'FAILED', failureReason: typeof payload?.detail === 'string' ? payload.detail : 'The provider rejected the refund.' } });
    throw new AppError(502, 'REFUND_REJECTED', 'The payment provider rejected the refund.');
  }
  return prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({ where: { id: refund.refund.id }, data: { status: 'SUCCEEDED', completedAt: new Date(), metadata: (payload ?? {}) as Prisma.InputJsonValue }, select: refundSelect });
    if (fullRefund) {
      const booking = await tx.booking.findUnique({ where: { id: payment.bookingId }, select: { userId: true } });
      await tx.payment.update({ where: { id: paymentId }, data: { status: 'REFUNDED' } });
      await tx.booking.update({ where: { id: payment.bookingId }, data: { status: 'REFUNDED', cancelledAt: new Date() } });
      await tx.ticket.updateMany({ where: { bookingId: payment.bookingId, status: { in: ['ISSUED', 'USED'] } }, data: { status: 'CANCELLED' } });
      if (booking) await tx.notification.create({ data: { userId: booking.userId, type: 'CANCELLATION', title: 'Payment refunded', body: 'Your payment has been refunded and the booking is no longer active.', data: { bookingId: payment.bookingId, refundId: refund.refund.id } } });
    }
    return updated;
  });
}

export async function reconcileRefund(refundId: string) {
  const refund = await prisma.refund.findUnique({ where: { id: refundId }, select: { id: true, paymentId: true, amount: true, status: true, payment: { select: { provider: true, providerReference: true, amount: true, bookingId: true } } } });
  if (!refund) throw new AppError(404, 'REFUND_NOT_FOUND', 'The requested refund was not found.');
  if (refund.status !== 'MANUAL_REQUIRED') throw new AppError(409, 'REFUND_NOT_RECONCILIABLE', 'Only refunds awaiting reconciliation can be reconciled.');
  if (refund.payment.provider !== 'KHALTI' || !refund.payment.providerReference || !env.KHALTI_SECRET_KEY) return refund;
  let response: Response;
  try {
    response = await fetch(`${env.KHALTI_BASE_URL.replace(/\/$/, '')}/merchant-transaction/${encodeURIComponent(refund.payment.providerReference)}/`, { headers: { Authorization: `Key ${env.KHALTI_SECRET_KEY}` } });
  } catch { throw new AppError(502, 'PAYMENT_PROVIDER_UNAVAILABLE', 'The provider could not be reached for reconciliation.'); }
  const payload = await response.json().catch(() => null) as Record<string, unknown> | null;
  const state = payload?.state && typeof payload.state === 'object' ? (payload.state as Record<string, unknown>).name : undefined;
  const confirmed = payload?.refunded === true || state === 'Refunded' || state === 'Partially refunded';
  if (!response.ok || !confirmed) throw new AppError(409, 'REFUND_NOT_CONFIRMED', 'The provider has not confirmed this refund.');
  const fullRefund = Math.abs(Number(refund.amount) - Number(refund.payment.amount)) <= 0.001;
  return prisma.$transaction(async (tx) => {
    const updated = await tx.refund.update({ where: { id: refund.id }, data: { status: 'SUCCEEDED', completedAt: new Date(), metadata: (payload ?? {}) as Prisma.InputJsonValue }, select: refundSelect });
    if (fullRefund) {
      const booking = await tx.booking.findUnique({ where: { id: refund.payment.bookingId }, select: { userId: true } });
      await tx.payment.update({ where: { id: refund.paymentId }, data: { status: 'REFUNDED' } });
      await tx.booking.update({ where: { id: refund.payment.bookingId }, data: { status: 'REFUNDED', cancelledAt: new Date() } });
      await tx.ticket.updateMany({ where: { bookingId: refund.payment.bookingId, status: { in: ['ISSUED', 'USED'] } }, data: { status: 'CANCELLED' } });
      if (booking) await tx.notification.create({ data: { userId: booking.userId, type: 'CANCELLATION', title: 'Payment refund confirmed', body: 'Your provider refund has been confirmed and the booking is no longer active.', data: { bookingId: refund.payment.bookingId, refundId: refund.id } } });
    }
    return updated;
  });
}
