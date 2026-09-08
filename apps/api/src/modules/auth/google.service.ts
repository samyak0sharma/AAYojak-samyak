import { OAuth2Client } from 'google-auth-library';
import { Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { getSafeUserById } from '../users/users.service.js';

export function googleOAuthConfigured() {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL);
}

function client() {
  if (!googleOAuthConfigured()) {
    throw new AppError(503, 'GOOGLE_OAUTH_NOT_CONFIGURED', 'Google sign-in is not configured on this server.');
  }
  return new OAuth2Client(env.GOOGLE_CLIENT_ID!, env.GOOGLE_CLIENT_SECRET!, env.GOOGLE_CALLBACK_URL);
}

export function googleAuthorizationUrl(state: string) {
  return client().generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: ['openid', 'email', 'profile'],
    state,
  });
}

export async function signInWithGoogle(code: string) {
  const oauthClient = client();
  const { tokens } = await oauthClient.getToken({
    code,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
  });
  if (!tokens.id_token) {
    throw new AppError(401, 'GOOGLE_ID_TOKEN_MISSING', 'Google did not return a usable identity token.');
  }

  const ticket = await oauthClient.verifyIdToken({
    idToken: tokens.id_token,
    audience: env.GOOGLE_CLIENT_ID!,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new AppError(401, 'GOOGLE_ACCOUNT_UNVERIFIED', 'Google could not verify this account.');
  }

  const email = payload.email.trim().toLowerCase();
  let user = await prisma.user.findUnique({
    where: { googleId: payload.sub },
    select: { id: true, email: true, googleId: true, isActive: true },
  });

  if (user && !user.isActive) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'The authenticated account is unavailable.');
  }

  if (!user) {
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, googleId: true, isActive: true },
    });
    if (existingByEmail && !existingByEmail.isActive) {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'The authenticated account is unavailable.');
    }
    if (existingByEmail?.googleId && existingByEmail.googleId !== payload.sub) {
      throw new AppError(409, 'GOOGLE_ACCOUNT_ALREADY_LINKED', 'This email is linked to another Google identity.');
    }

    if (existingByEmail) {
      user = await prisma.user.update({
        where: { id: existingByEmail.id },
        data: { googleId: payload.sub, emailVerifiedAt: new Date() },
        select: { id: true, email: true, googleId: true, isActive: true },
      });
    } else {
      const nameParts = (payload.name ?? '').trim().split(/\s+/).filter(Boolean);
      try {
        user = await prisma.user.create({
          data: {
            email,
            googleId: payload.sub,
            firstName: payload.given_name ?? nameParts[0] ?? 'Aayojak',
            lastName: (payload.family_name ?? nameParts.slice(1).join(' ')) || 'Member',
            avatarUrl: payload.picture,
            emailVerifiedAt: new Date(),
            role: 'USER',
          },
          select: { id: true, email: true, googleId: true, isActive: true },
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new AppError(409, 'GOOGLE_ACCOUNT_ALREADY_LINKED', 'This Google account is already linked.');
        }
        throw error;
      }
    }
  }

  return getSafeUserById(user.id);
}
