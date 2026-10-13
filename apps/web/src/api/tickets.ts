import { apiRequest } from './client';

export interface Ticket {
  id: string; ticketCode: string; status: string; issuedAt: string; checkedInAt?: string | null;
  booking: { id: string; bookingNumber: string; status: string; event: { id: string; slug: string; title: string; startAt: string; endAt: string; venueName: string; address: string } };
  bookingItem?: { id: string; ticketName: string; quantity: number; unitPrice: number | string } | null;
}
export function getMyTickets(page = 1, limit = 20) { return apiRequest<{ items: Ticket[]; pagination: { page: number; totalPages: number } }>(`/tickets?page=${page}&limit=${limit}`); }
export function getTicket(id: string) { return apiRequest<Ticket>(`/tickets/${encodeURIComponent(id)}`); }
export function getTicketQr(id: string) { return apiRequest<{ payload: string }>(`/tickets/${encodeURIComponent(id)}/qr`); }
