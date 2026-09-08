import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { updateUserSchema } from './users.schemas.js';
import { getSafeUserById, updateUser } from './users.service.js';

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get(
  '/me',
  asyncHandler(async (request, response) => {
    const user = await getSafeUserById(request.user!.id);
    sendSuccess(response, user);
  }),
);

usersRouter.patch(
  '/me',
  validate('body', updateUserSchema),
  asyncHandler(async (request, response) => {
    const user = await updateUser(request.user!.id, request.body);
    sendSuccess(response, user);
  }),
);

