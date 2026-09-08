import { apiRequest } from './client';

export type EventSort = 'upcoming' | 'newest' | 'popular' | 'price-low-high' | 'price-high-low';
export type EventType = 'FREE' | 'PAID';

export interface EventListQuery {
  search?: string;
  category?: string;
  location?: string;
  date?: string;
  type?: EventType;
  minPrice?: number;
  maxPrice?: number;
  sort?: EventSort;
  page?: number;
  limit?: number;
}

export interface OrganizerSummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  logoUrl?: string | null;
}

export interface CategorySummary {
  id: string;
  name: string;
  slug: string;
}

export interface TicketTierSummary {
  id: string;
  name: string;
  description?: string | null;
  price: string | number;
  currency: string;
  quantity: number;
  reservedQuantity: number;
  soldQuantity: number;
  saleStartAt?: string | null;
  saleEndAt?: string | null;
  isActive: boolean;
}

export interface EventSummary {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImageUrl?: string | null;
  eventType: EventType;
  status: string;
  startAt: string;
  endAt: string;
  timezone: string;
  venueName: string;
  address: string;
  capacity?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  publishedAt?: string | null;
  organizer: OrganizerSummary;
  categories: Array<{ category: CategorySummary }>;
  media: Array<{ id: string; mediaType: 'IMAGE' | 'VIDEO'; url: string; altText?: string | null; sortOrder: number }>;
  faqs: Array<{ id: string; question: string; answer: string; sortOrder: number }>;
  ticketTiers: TicketTierSummary[];
  _count: { bookings: number; reviews: number; favorites: number };
}

export interface Paginated<T> {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

function queryString(query: EventListQuery) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value));
  });
  const value = params.toString();
  return value ? `?${value}` : '';
}

export function getEvents(query: EventListQuery = {}) {
  return apiRequest<Paginated<EventSummary>>(`/events${queryString(query)}`);
}

export function getEvent(slug: string) {
  return apiRequest<EventSummary>(`/events/${encodeURIComponent(slug)}`);
}

export function getRelatedEvents(slug: string, limit = 4) {
  return apiRequest<EventSummary[]>(`/events/${encodeURIComponent(slug)}/related?limit=${limit}`);
}
