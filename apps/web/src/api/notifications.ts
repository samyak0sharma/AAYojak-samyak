import { apiRequest } from './client';

export interface NotificationItem { id: string; type: string; title: string; body: string; data?: unknown; readAt?: string | null; createdAt: string }
export function getNotifications(page = 1) { return apiRequest<{ items: NotificationItem[]; pagination: { page: number; totalPages: number } }>(`/notifications?page=${page}&limit=25`); }
export function markNotificationRead(id: string) { return apiRequest<{ updated: boolean }>(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: JSON.stringify({}) }); }
export function markAllNotificationsRead() { return apiRequest<{ updated: number }>('/notifications/read-all', { method: 'POST', body: JSON.stringify({}) }); }
