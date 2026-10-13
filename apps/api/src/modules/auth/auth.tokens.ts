import { createHash, randomBytes } from 'node:crypto';
import type { Request, Response } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../../config/env.js';

export const ACCESS_COOKIE_NAME = 'aayojak_access';
export const REFRESH_COOKIE_NAME = 'aayojak_refresh';
export const OAUTH_STATE_COOKIE_NAME = 'aayojak_oauth_state';

export interface AuthenticatedAccount {
  id: string;
  email: string;
  role: UserRole;
}

export function generateOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

export function hashOpaqueToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function parseDurationMs(value: string) {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) {
    throw new Error(`Unsupported duration: ${value}`);
  }
  const amount = Number(match[1]);
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const unit = match[2];
  if (!unit) {
    throw new Error(`Unsupported duration unit: ${match[2]}`);
  }
  const multiplier = multipliers[unit];
  if (!multiplier) {
    throw new Error(`Unsupported duration unit: ${match[2]}`);
  }
  return amount * multiplier;
}

export function issueAccessToken(account: AuthenticatedAccount) {
  const options: SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };
  return jwt.sign(
    {
      sub: account.id,
      email: account.email,
      role: account.role,
      type: 'access',
    },
    env.JWT_SECRET,
    options,
  );
}

function cookieSecurity() {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
}

export function setAccessCookie(response: Response, token: string) {
  response.cookie(ACCESS_COOKIE_NAME, token, {
    ...cookieSecurity(),
    path: '/',
    maxAge: parseDurationMs(env.JWT_EXPIRES_IN),
  });
}

export function setRefreshCookie(response: Response, token: string) {
  response.cookie(REFRESH_COOKIE_NAME, token, {
    ...cookieSecurity(),
    path: '/api/auth',
    maxAge: parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN),
  });
}

export function clearAuthCookies(response: Response) {
  response.clearCookie(ACCESS_COOKIE_NAME, { ...cookieSecurity(), path: '/' });
  response.clearCookie(REFRESH_COOKIE_NAME, { ...cookieSecurity(), path: '/api/auth' });
}

export function setOAuthStateCookie(response: Response, state: string) {
  response.cookie(OAUTH_STATE_COOKIE_NAME, state, {
    ...cookieSecurity(),
    path: '/api/auth',
    maxAge: 10 * 60 * 1_000,
  });
}

export function clearOAuthStateCookie(response: Response) {
  response.clearCookie(OAUTH_STATE_COOKIE_NAME, { ...cookieSecurity(), path: '/api/auth' });
}

export function requestMetadata(request: Request) {
  return {
    userAgent: request.get('user-agent')?.slice(0, 500),
    ipAddress: request.ip?.slice(0, 64),
  };
}
