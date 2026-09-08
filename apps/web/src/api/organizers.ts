import { apiRequest } from './client';
import type { EventSummary, Paginated } from './events';

export type OrganizerEvent = Pick<EventSummary, 'id' | 'slug' | 'title' | 'coverImageUrl' | 'eventType' | 'startAt' | 'endAt' | 'timezone' | 'venueName' | 'address'>;

export interface Organizer {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  location?: string | null;
  socialLinks?: Record<string, string> | null;
  createdAt: string;
  _count?: { events: number };
}

export function getOrganizers(page = 1, limit = 24) {
  return apiRequest<Paginated<Organizer>>(`/organizers?page=${page}&limit=${limit}`);
}

export function getOrganizer(id: string) {
  return apiRequest<Organizer>(`/organizers/${encodeURIComponent(id)}`);
}

export function getOrganizerEvents(id: string) {
  return apiRequest<OrganizerEvent[]>(`/organizers/${encodeURIComponent(id)}/events`);
}

export type OrganizerEventStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'PUBLISHED' | 'CANCELLED';
export interface OrganizerEventListQuery {
  search?: string;
  status?: OrganizerEventStatus;
  date?: string;
  sort?: 'upcoming' | 'newest' | 'updated' | 'title';
  page?: number;
  limit?: number;
}

export interface OrganizerMediaInput { mediaType: 'IMAGE' | 'VIDEO'; url: string; altText?: string | null; sortOrder?: number }
export interface OrganizerFaqInput { question: string; answer: string; sortOrder?: number }
export interface OrganizerTicketInput { id?: string; name: string; description?: string | null; price: number; currency?: string; quantity: number; saleStartAt?: string | null; saleEndAt?: string | null; isActive?: boolean }
export interface OrganizerEventInput {
  title: string; slug?: string; description: string; categoryIds: string[]; coverImageUrl?: string | null; media: OrganizerMediaInput[];
  startAt: string; endAt: string; timezone: string; venueName: string; address: string; capacity?: number | null; latitude?: number | null; longitude?: number | null;
  eventType: 'FREE' | 'PAID'; terms?: string | null; faqs: OrganizerFaqInput[]; ticketTiers: OrganizerTicketInput[];
}

export interface OrganizerEventDetail extends OrganizerEvent {
  organizerId: string; description: string; status: OrganizerEventStatus; terms?: string | null; capacity?: number | null; latitude?: number | null; longitude?: number | null;
  categories: Array<{ category: { id: string; name: string; slug: string } }>;
  media: Array<{ id: string; mediaType: 'IMAGE' | 'VIDEO'; url: string; altText?: string | null; sortOrder: number }>;
  faqs: Array<{ id: string; question: string; answer: string; sortOrder: number }>;
  ticketTiers: Array<{ id: string; name: string; description?: string | null; price: number | string; currency: string; quantity: number; reservedQuantity: number; soldQuantity: number; saleStartAt?: string | null; saleEndAt?: string | null; isActive: boolean }>;
  _count: { bookings: number; reviews: number; favorites: number };
}

export interface OrganizerAnalytics {
  overview: { totalEvents: number; publishedEvents: number; draftEvents: number; submittedEvents: number; rejectedEvents: number; totalBookings: number; totalAttendees: number; ticketsSold: number; grossRevenue: number; pendingRevenue: number; refundedAmount: number };
  series: Array<{ month: string; bookings: number; revenue: number }>;
}

export interface OrganizerRevenue { grossRevenue: number; successfulPayments: number; pendingPayments: number; refundedAmount: number; estimatedNetRevenue: number }

function queryString(query: object) {
  const params = new URLSearchParams(); Object.entries(query).forEach(([key, value]) => { if (value !== undefined && value !== '') params.set(key, String(value)); }); const result = params.toString(); return result ? `?${result}` : '';
}

export function getMyOrganizer() { return apiRequest<Organizer | null>('/organizers/me'); }
export function updateMyOrganizer(input: Partial<Organizer> & { name: string }) { return apiRequest<Organizer>('/organizers/me', { method: 'PATCH', body: JSON.stringify(input) }); }
export function getMyOrganizerEvents(query: OrganizerEventListQuery = {}) { return apiRequest<Paginated<OrganizerEventDetail>>(`/organizers/me/events${queryString(query)}`); }
export function getMyOrganizerEvent(id: string) { return apiRequest<OrganizerEventDetail>(`/organizers/me/events/${encodeURIComponent(id)}`); }
export function createMyOrganizerEvent(input: OrganizerEventInput) { return apiRequest<OrganizerEventDetail>('/organizers/me/events', { method: 'POST', body: JSON.stringify(input) }); }
export function updateMyOrganizerEvent(id: string, input: OrganizerEventInput) { return apiRequest<OrganizerEventDetail>(`/organizers/me/events/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }); }
export function submitMyOrganizerEvent(id: string) { return apiRequest<OrganizerEventDetail>(`/organizers/me/events/${encodeURIComponent(id)}/submit`, { method: 'POST', body: JSON.stringify({}) }); }
export function cancelMyOrganizerEvent(id: string) { return apiRequest<OrganizerEventDetail>(`/organizers/me/events/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({}) }); }
export function deleteMyOrganizerDraft(id: string) { return apiRequest<{ id: string }>(`/organizers/me/events/${encodeURIComponent(id)}`, { method: 'DELETE' }); }

export interface OrganizerBooking { id: string; bookingNumber: string; status: string; currency: string; subtotal: number | string; fees: number | string; discount: number | string; total: number | string; confirmedAt?: string | null; createdAt: string; user: { id: string; email: string; firstName: string; lastName: string }; event: { id: string; title: string; slug: string; startAt: string; venueName: string }; items: Array<{ id: string; ticketName: string; quantity: number; unitPrice: number | string; lineTotal: number | string; ticketTier?: { id: string; name: string } | null }>; payments: Array<{ id: string; provider: string; status: string; amount: number | string; currency: string; completedAt?: string | null }> }
export interface OrganizerAttendee { bookingId: string; bookingNumber: string; event: { id: string; title: string; startAt: string }; attendee: { id: string; firstName: string; lastName: string; email: string }; ticketName: string; quantity: number; ticket: { id: string; ticketCode: string; status: string; checkedInAt?: string | null } | null }
export interface OrganizerTicket { id: string; ticketCode: string; status: string; issuedAt: string; checkedInAt?: string | null; booking: { id: string; bookingNumber: string; status: string; event: { id: string; title: string; startAt: string }; user: { id: string; firstName: string; lastName: string; email: string } }; bookingItem?: { id: string; ticketName: string; quantity: number; unitPrice: number | string; ticketTier?: { id: string; name: string } | null } | null }
export function getMyOrganizerBookings(query: { page?: number; limit?: number; status?: string; search?: string; eventId?: string } = {}) { return apiRequest<Paginated<OrganizerBooking>>(`/organizers/me/bookings${queryString(query)}`); }
export function getMyOrganizerAttendees(query: { page?: number; limit?: number; search?: string; eventId?: string; checkedIn?: 'true' | 'false' } = {}) { return apiRequest<Paginated<OrganizerAttendee>>(`/organizers/me/attendees${queryString(query)}`); }
export function getMyOrganizerTickets(query: { page?: number; limit?: number } = {}) { return apiRequest<Paginated<OrganizerTicket>>(`/organizers/me/tickets${queryString(query)}`); }
export function getMyOrganizerAnalytics() { return apiRequest<OrganizerAnalytics>('/organizers/me/analytics'); }
export function getMyOrganizerRevenue() { return apiRequest<OrganizerRevenue>('/organizers/me/revenue'); }
