import { apiRequest } from './client';

export interface AuthUser {
  id: string;
  email: string;
  role: 'USER' | 'ORGANIZER' | 'ADMIN';
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  emailVerifiedAt?: string | null;
}

export interface AuthSessionResponse {
  user: AuthUser;
  session?: { refreshExpiresAt: string };
  emailVerification?: { status: 'accepted' | 'not_configured'; expiresAt: string };
}

export const authApi = {
  register(input: { email: string; password: string; firstName: string; lastName: string }) {
    return apiRequest<AuthSessionResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  login(input: { email: string; password: string }) {
    return apiRequest<AuthSessionResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },
  logout() {
    return apiRequest<{ loggedOut: true }>('/auth/logout', { method: 'POST' });
  },
  refresh() {
    return apiRequest<AuthSessionResponse>('/auth/refresh', { method: 'POST' });
  },
  me() {
    return apiRequest<AuthUser>('/auth/me');
  },
  forgotPassword(email: string) {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
  resetPassword(token: string, password: string) {
    return apiRequest<{ reset: true }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  },
  verifyEmail(token: string) {
    return apiRequest<{ verified: true }>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },
  resendVerification(email: string) {
    return apiRequest<{ message: string }>('/auth/resend-verification', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};

