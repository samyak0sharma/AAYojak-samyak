import { timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import { env } from '../../config/env.js';
import { AppError, asyncHandler, sendSuccess } from '../../lib/http.js';
import { authRateLimiter } from '../../middleware/rateLimit.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import {
  clearOAuthStateCookie,
  generateOpaqueToken,
  OAUTH_STATE_COOKIE_NAME,
  setOAuthStateCookie,
} from './auth.tokens.js';
import {
  emailOnlySchema,
  loginSchema,
  oauthCallbackSchema,
  registerSchema,
  resetPasswordSchema,
  tokenSchema,
} from './auth.schemas.js';
import {
  currentUser,
  createSessionForAccount,
  loginUser,
  logoutUser,
  refreshUserSession,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from './auth.service.js';
import { googleAuthorizationUrl, googleOAuthConfigured, signInWithGoogle } from './google.service.js';

export const authRouter = Router();
const authLimiter = authRateLimiter;

authRouter.post(
  '/register',
  authLimiter,
  validate('body', registerSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await registerUser(request.body), 201);
  }),
);

authRouter.post(
  '/login',
  authLimiter,
  validate('body', loginSchema),
  asyncHandler(async (request, response) => {
    sendSuccess(response, await loginUser(request.body, request, response));
  }),
);

authRouter.post(
  '/logout',
  asyncHandler(async (request, response) => {
    await logoutUser(request, response);
    sendSuccess(response, { loggedOut: true });
  }),
);

authRouter.post(
  '/refresh',
  authLimiter,
  asyncHandler(async (request, response) => {
    sendSuccess(response, await refreshUserSession(request, response));
  }),
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (request, response) => {
    sendSuccess(response, await currentUser(request.user!.id));
  }),
);

authRouter.post(
  '/forgot-password',
  authLimiter,
  validate('body', emailOnlySchema),
  asyncHandler(async (request, response) => {
    await requestPasswordReset(request.body.email);
    sendSuccess(response, {
      message: 'If an account exists for that email, reset instructions will be sent.',
    });
  }),
);

authRouter.post(
  '/reset-password',
  authLimiter,
  validate('body', resetPasswordSchema),
  asyncHandler(async (request, response) => {
    await resetPassword(request.body.token, request.body.password);
    sendSuccess(response, { reset: true });
  }),
);

authRouter.post(
  '/verify-email',
  authLimiter,
  validate('body', tokenSchema),
  asyncHandler(async (request, response) => {
    await verifyEmail(request.body.token);
    sendSuccess(response, { verified: true });
  }),
);

authRouter.post(
  '/resend-verification',
  authLimiter,
  validate('body', emailOnlySchema),
  asyncHandler(async (request, response) => {
    await resendVerification(request.body.email);
    sendSuccess(response, {
      message: 'If the account exists and is unverified, verification instructions will be sent.',
    });
  }),
);

authRouter.get(
  '/google',
  authLimiter,
  asyncHandler(async (_request, response) => {
    if (!googleOAuthConfigured()) {
      throw new AppError(503, 'GOOGLE_OAUTH_NOT_CONFIGURED', 'Google sign-in is not configured on this server.');
    }
    const state = generateOpaqueToken();
    setOAuthStateCookie(response, state);
    response.redirect(googleAuthorizationUrl(state));
  }),
);

authRouter.get(
  '/google/callback',
  authLimiter,
  validate('query', oauthCallbackSchema),
  asyncHandler(async (request, response) => {
    const query = request.query as unknown as { code?: string; state?: string; error?: string };
    const expectedState = request.cookies?.[OAUTH_STATE_COOKIE_NAME] as string | undefined;
    clearOAuthStateCookie(response);

    if (query.error) {
      response.redirect(new URL('/login?error=oauth_denied', env.FRONTEND_URL).toString());
      return;
    }
    if (!query.code || !query.state || !expectedState) {
      throw new AppError(400, 'INVALID_OAUTH_CALLBACK', 'The OAuth callback is missing required parameters.');
    }

    const expectedBuffer = Buffer.from(expectedState);
    const receivedBuffer = Buffer.from(query.state);
    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new AppError(400, 'INVALID_OAUTH_STATE', 'The OAuth state could not be verified.');
    }

    let user: Awaited<ReturnType<typeof signInWithGoogle>>;
    try {
      user = await signInWithGoogle(query.code);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(401, 'GOOGLE_AUTH_FAILED', 'Google authentication could not be completed.');
    }
    await createSessionForAccount(
      response,
      request,
      { id: user.id, email: user.email, role: user.role },
    );
    response.redirect(new URL('/auth/callback', env.FRONTEND_URL).toString());
  }),
);
