import { apiRequest } from './client';
import type { Paginated } from './events';

export interface ReviewAuthor {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
}

export interface EventReview {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: ReviewAuthor;
}

export interface EventReviewResponse extends Paginated<EventReview> {
  summary: { averageRating: number; reviewCount: number };
}

export function getEventReviews(eventId: string, page = 1, limit = 6) {
  return apiRequest<EventReviewResponse>(`/events/${encodeURIComponent(eventId)}/reviews?page=${page}&limit=${limit}`);
}
