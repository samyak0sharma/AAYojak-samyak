import bcrypt from 'bcryptjs';
import { Prisma, type UserRole } from '@prisma/client';
import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { AppError } from '../../lib/http.js';
import { prisma } from '../../lib/prisma.js';
import { emailService } from '../../services/email/email.service.js';
import { getSafeUserById, safeUserSelect } from '../users/users.service.js';
import {
  clearAuthCookies,
  generateOpaqueToken,
  hashOpaqueToken,
  issueAccessToken,
  parseDurationMs,
  requestMetadata,
  setAccessCookie,
  setRefreshCookie,
  type AuthenticatedAccount,
} from './auth.tokens.js';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1_000;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function publicAccount(user: {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  emailVerifiedAt: Date | null;
}) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
    lastName: user.lastName,
    emailVerifiedAt: user.emailVerifiedAt,
  };
}

export async function createSessionForAccount(response: Response, request: Request, account: AuthenticatedAccount) {
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN));
  const metadata = requestMetadata(request);

  await prisma.authSession.create({
    data: {
      userId: account.id,
      refreshTokenHash: hashOpaqueToken(refreshToken),
      expiresAt,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
    },
  });

  setAccessCookie(response, issueAccessToken(account));
  setRefreshCookie(response, refreshToken);
  return { refreshExpiresAt: expiresAt };
}

async function createVerificationToken(userId: string) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId, consumedAt: null } }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashOpaqueToken(token), expiresAt },
    }),
  ]);
  return { token, expiresAt };
}

async function createPasswordResetToken(userId: string) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS);
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, consumedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash: hashOpaqueToken(token), expiresAt },
    }),
  ]);
  return { token, expiresAt };
}

export async function registerUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const email = normalizeEmail(input.email);
  const passwordHash = await bcrypt.hash(input.password, 12);

  let user;
  try {
    user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: 'USER',
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        emailVerifiedAt: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with those credentials already exists.');
    }
    throw error;
  }

  const verification = await createVerificationToken(user.id);
  const delivery = await emailService.sendVerificationEmail({
    to: user.email,
    recipientName: user.firstName,
    token: verification.token,
    expiresAt: verification.expiresAt,
  });

  return {
    user: publicAccount(user),
    emailVerification: {
      status: delivery.status,
      expiresAt: verification.expiresAt,
    },
  };
}

export async function loginUser(
  input: { email: string; password: string },
  request: Request,
  response: Response,
) {
  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail(input.email) },
    select: {
      id: true,
      email: true,
      role: true,
      firstName: true,
      lastName: true,
      emailVerifiedAt: true,
      isActive: true,
      passwordHash: true,
    },
  });

  const passwordMatches = user?.passwordHash
    ? await bcrypt.compare(input.password, user.passwordHash)
    : false;
  if (!user || !user.isActive || !passwordMatches) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
  }
  if (!user.emailVerifiedAt) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in.');
  }

  const session = await createSessionForAccount(response, request, {
    id: user.id,
    email: user.email,
    role: user.role,
  });

  return {
    user: publicAccount(user),
    session: { refreshExpiresAt: session.refreshExpiresAt },
  };
}

export async function logoutUser(request: Request, response: Response) {
  const refreshToken = request.cookies?.aayojak_refresh as string | undefined;
  if (refreshToken) {
    await prisma.authSession.updateMany({
      where: { refreshTokenHash: hashOpaqueToken(refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
  clearAuthCookies(response);
}

export async function refreshUserSession(request: Request, response: Response) {
  const refreshToken = request.cookies?.aayojak_refresh as string | undefined;
  if (!refreshToken) {
    throw new AppError(401, 'REFRESH_TOKEN_REQUIRED', 'A valid refresh session is required.');
  }

  const session = await prisma.authSession.findUnique({
    where: { refreshTokenHash: hashOpaqueToken(refreshToken) },
    select: {
      id: true,
      expiresAt: true,
      revokedAt: true,
      user: { select: safeUserSelect },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date() || !session.user) {
    clearAuthCookies(response);
    throw new AppError(401, 'INVALID_REFRESH_SESSION', 'The refresh session is invalid or expired.');
  }

  const account = session.user;
  if (!account.emailVerifiedAt) {
    clearAuthCookies(response);
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in.');
  }

  const replacementRefreshToken = generateOpaqueToken();
  const replacementExpiresAt = new Date(Date.now() + parseDurationMs(env.REFRESH_TOKEN_EXPIRES_IN));
  const metadata = requestMetadata(request);

  await prisma.$transaction(async (transaction) => {
    const revoked = await transaction.authSession.updateMany({
      where: { id: session.id, revokedAt: null },
      data: { revokedAt: new Date(), lastUsedAt: new Date() },
    });
    if (revoked.count !== 1) {
      throw new AppError(401, 'INVALID_REFRESH_SESSION', 'The refresh session is invalid or expired.');
    }
    await transaction.authSession.create({
      data: {
        userId: account.id,
        refreshTokenHash: hashOpaqueToken(replacementRefreshToken),
        expiresAt: replacementExpiresAt,
        userAgent: metadata.userAgent,
        ipAddress: metadata.ipAddress,
      },
    });
  });

  setAccessCookie(response, issueAccessToken({ id: account.id, email: account.email, role: account.role }));
  setRefreshCookie(response, replacementRefreshToken);
  return { user: account, session: { refreshExpiresAt: replacementExpiresAt } };
}

export async function requestPasswordReset(emailInput: string) {
  const user = await prisma.user.findFirst({
    where: { email: normalizeEmail(emailInput), isActive: true },
    select: { id: true, email: true, firstName: true },
  });

  if (user) {
    const reset = await createPasswordResetToken(user.id);
    await emailService.sendPasswordResetEmail({
      to: user.email,
      recipientName: user.firstName,
      token: reset.token,
      expiresAt: reset.expiresAt,
    });
  }
}

export async function resetPassword(token: string, password: string) {
  const record = await prisma.passwordResetToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      consumedAt: null,
      expiresAt: { gt: new Date() },
      user: { isActive: true },
    },
    select: { id: true, userId: true },
  });
  if (!record) {
    throw new AppError(400, 'INVALID_RESET_TOKEN', 'The password reset token is invalid or expired.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.$transaction(async (transaction) => {
    const consumed = await transaction.passwordResetToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'The password reset token is invalid or expired.');
    }
    await transaction.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await transaction.authSession.updateMany({
      where: { userId: record.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  });
}

export async function verifyEmail(token: string) {
  const record = await prisma.emailVerificationToken.findFirst({
    where: {
      tokenHash: hashOpaqueToken(token),
      consumedAt: null,
      expiresAt: { gt: new Date() },
      user: { isActive: true },
    },
    select: { id: true, userId: true },
  });
  if (!record) {
    throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'The verification token is invalid or expired.');
  }

  await prisma.$transaction(async (transaction) => {
    const consumed = await transaction.emailVerificationToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new AppError(400, 'INVALID_VERIFICATION_TOKEN', 'The verification token is invalid or expired.');
    }
    await transaction.user.update({
      where: { id: record.userId },
      data: { emailVerifiedAt: new Date() },
    });
  });
}

export async function resendVerification(emailInput: string) {
  const user = await prisma.user.findFirst({
    where: { email: normalizeEmail(emailInput), isActive: true, emailVerifiedAt: null },
    select: { id: true, email: true, firstName: true },
  });
  if (user) {
    const verification = await createVerificationToken(user.id);
    await emailService.sendVerificationEmail({
      to: user.email,
      recipientName: user.firstName,
      token: verification.token,
      expiresAt: verification.expiresAt,
    });
  }
}

export async function currentUser(id: string) {
  return getSafeUserById(id);
}
