import { apiRequest } from './client';
import type { Paginated } from './events';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  _count?: { events: number };
}

export function getCategories(page = 1, limit = 50) {
  return apiRequest<Paginated<Category>>(`/categories?page=${page}&limit=${limit}`);
}

export function getCategory(slug: string) {
  return apiRequest<Category>(`/categories/${encodeURIComponent(slug)}`);
}

