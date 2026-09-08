import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../lib/http.js';

export const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected error occurred.';
  let details: unknown;

  if (error instanceof AppError) {
    statusCode = error.statusCode;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'One or more fields failed validation.';
    details = error.flatten();
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      statusCode = 409;
      code = 'RESOURCE_CONFLICT';
      message = 'A resource with the same unique value already exists.';
      details = error.meta;
    } else if (error.code === 'P2025') {
      statusCode = 404;
      code = 'RESOURCE_NOT_FOUND';
      message = 'The requested resource was not found.';
    } else if (error.code === 'P2003') {
      statusCode = 409;
      code = 'RELATED_RESOURCE_CONFLICT';
      message = 'The resource cannot be changed because related records exist.';
    } else if (error.code === 'P2024') {
      statusCode = 503;
      code = 'DATABASE_TIMEOUT';
      message = 'The data service is temporarily unavailable.';
    }
  } else if (error instanceof SyntaxError && 'body' in error) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'The request body contains invalid JSON.';
  }

  if (statusCode >= 500) {
    console.error('Aayojak API request failed.', {
      method: request.method,
      path: request.path,
      error,
    });
  }

  response.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details === undefined ? {} : { details }),
    },
  });
};
