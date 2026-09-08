import type { RequestHandler } from 'express';
import { AppError } from '../lib/http.js';

export const notFoundHandler: RequestHandler = (request, _response, next) => {
  next(new AppError(404, 'ROUTE_NOT_FOUND', `No route matches ${request.method} ${request.path}.`));
};
