import { Router } from 'express';
import { asyncHandler, sendSuccess } from '../../lib/http.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { uploadSignatureSchema } from './uploads.schemas.js';
import { createUploadSignature } from './uploads.service.js';

export const uploadsRouter = Router();
uploadsRouter.use(requireAuth, requireRole('ORGANIZER', 'ADMIN'));
uploadsRouter.post('/sign', validate('body', uploadSignatureSchema), asyncHandler(async (request, response) => sendSuccess(response, createUploadSignature(request.user!.id, request.body))));
