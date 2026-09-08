import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';
import { AppError } from '../lib/http.js';

type ValidationTarget = 'body' | 'params' | 'query';

export function validate(target: ValidationTarget, schema: ZodTypeAny): RequestHandler {
  return (request, _response, next) => {
    const result = schema.safeParse(request[target]);

    if (!result.success) {
      next(
        new AppError(422, 'VALIDATION_ERROR', 'One or more fields failed validation.', result.error.flatten()),
      );
      return;
    }

    Object.assign(request[target], result.data);
    next();
  };
}

