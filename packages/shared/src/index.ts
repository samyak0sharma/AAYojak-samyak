export const AAYOJAK_BRAND = 'Aayojak';

export type UserRole = 'USER' | 'ORGANIZER' | 'ADMIN';

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
}

