import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';
import type { UserRole } from '@prisma/client';
import { env } from '../config/env.js';
import { AppError } from '../lib/http.js';
import { prisma } from '../lib/prisma.js';
import { ACCESS_COOKIE_NAME } from '../modules/auth/auth.tokens.js';

interface AccessTokenPayload extends JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  type?: 'access';
}

function tokenFromRequest(request: Parameters<RequestHandler>[0]) {
  const header = request.header('authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return request.cookies?.[ACCESS_COOKIE_NAME] as string | undefined;
}

function decodeUser(request: Parameters<RequestHandler>[0]) {
  const token = tokenFromRequest(request);
  if (!token) {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'A valid authentication token is required.');
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;
    const validRole = payload.role === 'USER' || payload.role === 'ORGANIZER' || payload.role === 'ADMIN';
    if (!payload.sub || !payload.email || !validRole || (payload.type && payload.type !== 'access')) {
      throw new Error('Invalid token claims.');
    }
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    throw new AppError(401, 'INVALID_ACCESS_TOKEN', 'The access token is invalid or expired.');
  }
}

async function loadAuthoritativeUser(request: Parameters<RequestHandler>[0]) {
  const tokenUser = decodeUser(request);
  const user = await prisma.user.findUnique({
    where: { id: tokenUser.id },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new AppError(401, 'ACCOUNT_INACTIVE', 'The authenticated account is unavailable.');
  }
  return { id: user.id, email: user.email, role: user.role };
}

export const requireAuth: RequestHandler = (request, _response, next) => {
  void loadAuthoritativeUser(request)
    .then((user) => {
      request.user = user;
      next();
    })
    .catch(next);
};

export const optionalAuth: RequestHandler = (request, _response, next) => {
  const token = tokenFromRequest(request);
  if (!token) {
    next();
    return;
  }

  void loadAuthoritativeUser(request)
    .then((user) => {
      request.user = user;
      next();
    })
    .catch(next);
};

/*
 * Role checks intentionally consume request.user populated by requireAuth.
 * They never read a role from request.body, params, or query strings.
 */
export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.user) {
      next(new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.'));
      return;
    }
    if (!roles.includes(request.user.role)) {
      next(new AppError(403, 'FORBIDDEN', 'You do not have permission to access this resource.'));
      return;
    }
    next();
  };
}
