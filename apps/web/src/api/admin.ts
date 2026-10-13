import { apiRequest } from './client';

export interface AdminOverview { users: number; organizers: number; events: number; bookings: number; tickets: number; reviews: number; confirmedRevenue: number | string }
export interface AdminEvent { id: string; title: string; status: string; startAt: string; organizer: { name: string }; moderationNote?: string | null }
export interface AdminReport { id: string; targetType: string; targetId: string; reason: string; description: string; status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED'; resolutionNote?: string | null; createdAt: string; reporter?: { firstName: string; lastName: string; email: string } | null }
export interface AdminPayment { id: string; provider: string; status: string; providerReference?: string | null; amount: number | string; currency: string; completedAt?: string | null; booking: { id: string; bookingNumber: string; event: { id: string; title: string }; user: { firstName: string; lastName: string; email: string } }; refunds: Array<{ id: string; amount: number | string; status: string; reason: string; failureReason?: string | null; completedAt?: string | null }> }
export function getAdminOverview() { return apiRequest<AdminOverview>('/admin/overview'); }
export function getAdminEvents() { return apiRequest<{ items: AdminEvent[]; pagination: { total: number } }>('/admin/events?status=SUBMITTED&page=1&limit=50'); }
export function moderateAdminEvent(id: string, action: 'approve' | 'reject', note?: string) { return apiRequest<AdminEvent>(`/admin/events/${encodeURIComponent(id)}/${action}`, { method: 'POST', body: JSON.stringify({ note: note || null }) }); }
export function getAdminReports() { return apiRequest<{ items: AdminReport[]; pagination: { total: number } }>('/admin/reports?page=1&limit=50'); }
export function updateAdminReport(id: string, status: AdminReport['status'], resolutionNote?: string) { return apiRequest<AdminReport>(`/admin/reports/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ status, resolutionNote: resolutionNote || null }) }); }
export function getAdminPayments(page = 1) { return apiRequest<{ items: AdminPayment[]; pagination: { page: number; totalPages: number } }>(`/admin/payments?page=${page}&limit=25`); }
export function refundAdminPayment(paymentId: string, reason: string, amount?: number) { return apiRequest(`/admin/payments/${encodeURIComponent(paymentId)}/refund`, { method: 'POST', body: JSON.stringify({ reason, ...(amount ? { amount } : {}) }) }); }
