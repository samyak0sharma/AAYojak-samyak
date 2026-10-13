import { apiRequest } from './client';
import type { Paginated } from './events';

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED' | 'REFUNDED';
export interface BookingItem { id: string; ticketName: string; quantity: number; unitPrice: number | string; lineTotal: number | string; ticketTier?: { id: string; name: string } | null }
export interface Booking {
  id: string; bookingNumber: string; status: BookingStatus; currency: string; subtotal: number | string; fees: number | string; discount: number | string; total: number | string;
  expiresAt?: string | null; confirmedAt?: string | null; cancelledAt?: string | null; createdAt: string; updatedAt: string;
  user: { id: string; email: string; firstName: string; lastName: string };
  event: { id: string; slug: string; title: string; coverImageUrl?: string | null; startAt: string; endAt: string; venueName: string; address: string; organizer: { id: string; name: string; slug: string } };
  items: BookingItem[];
  payments: Array<{ id: string; provider: string; status: string; providerReference?: string | null; amount: number | string; currency: string; initiatedAt: string; completedAt?: string | null }>;
  tickets: Array<{ id: string; ticketCode: string; status: string; issuedAt: string; checkedInAt?: string | null }>;
}

export interface CreateBookingInput { eventId: string; items: Array<{ ticketTierId?: string; quantity: number }> }
export type PaymentProvider = 'KHALTI' | 'ESEWA';
export interface PaymentInitiation { provider: PaymentProvider; redirectUrl: string; form?: Record<string, string> }

export function getBookings(query: { page?: number; limit?: number; status?: BookingStatus } = {}) {
  const params = new URLSearchParams();
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));
  if (query.status) params.set('status', query.status);
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<Paginated<Booking>>(`/bookings${suffix}`);
}

export function getBooking(id: string) { return apiRequest<Booking>(`/bookings/${encodeURIComponent(id)}`); }
export function createBooking(input: CreateBookingInput) { return apiRequest<Booking>('/bookings', { method: 'POST', body: JSON.stringify(input) }); }
export function cancelBooking(id: string) { return apiRequest<Booking>(`/bookings/${encodeURIComponent(id)}/cancel`, { method: 'POST' }); }
export function initiatePayment(bookingId: string, provider: PaymentProvider) { return apiRequest<PaymentInitiation>(`/payments/${encodeURIComponent(bookingId)}/initiate`, { method: 'POST', body: JSON.stringify({ provider }) }); }

export { getMyOrganizerBookings } from './organizers';
export type { OrganizerBooking, OrganizerAttendee } from './organizers';
