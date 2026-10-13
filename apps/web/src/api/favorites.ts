import { apiRequest } from './client';

export interface FavoriteItem { id: string; createdAt: string; event: { id: string; slug: string; title: string; coverImageUrl?: string | null; eventType: 'FREE' | 'PAID'; startAt: string; endAt: string; venueName: string; address: string; organizer: { id: string; name: string; slug: string } } }
export function getFavorites(page = 1) { return apiRequest<{ items: FavoriteItem[]; pagination: { page: number; totalPages: number } }>(`/favorites?page=${page}&limit=20`); }
export function addFavorite(eventId: string) { return apiRequest<FavoriteItem>('/favorites', { method: 'POST', body: JSON.stringify({ eventId }) }); }
export function removeFavorite(eventId: string) { return apiRequest<{ removed: boolean }>(`/favorites/${encodeURIComponent(eventId)}`, { method: 'DELETE' }); }
