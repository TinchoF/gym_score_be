/**
 * Centralized Error Handler Middleware
 * Catches all Express errors and returns consistent JSON responses
 * Supports Zod validation errors, Mongoose errors, and custom app errors
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import logger from '../utils/logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Format Zod validation errors into user-friendly messages
 */
const formatZodError = (error: ZodError): string => {
  const errors = error.issues.map((err) => {
    const path = err.path.join('.');
    return `${path}: ${err.message}`;
  });
  return `Errores de validación: ${errors.join(', ')}`;
};

/**
 * Main error handler middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Error interno del servidor';
  const isOperational = err.isOperational ?? false;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = formatZodError(err);
  }
  
  // Handle Mongoose validation errors
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = `Error de validación: ${err.message}`;
  }
  
  // Handle Mongoose cast errors (invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `ID inválido: ${err.value}`;
  }
  
  // Handle Mongoose duplicate key errors
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    message = `Ya existe un registro con ${field}: ${err.keyValue?.[field]}`;
  }

  // Handle JWT errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token inválido';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expirado';
  }

  // Log error details
  logger.error('Error:', {
    message: err.message,
    statusCode,
    path: req.path,
    method: req.method,
    stack: isOperational ? undefined : err.stack,
    ...(err instanceof ZodError && { zodErrors: err.issues }),
  });

  // Don't leak error details in production for server errors
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Error interno del servidor';
  }

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: err.stack,
      ...(err instanceof ZodError && { details: err.issues }),
    }),
  });
};

/**
 * Factory for creating operational errors with status codes
 */
export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
};

/**
 * Async handler wrapper to catch errors in async route handlers
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export const asyncHandler = (fn: Function) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Validation middleware factory for Zod schemas
 * Usage: router.post('/path', validate(createGymnastSchema), handler);
 */
export const validate = (schema: any) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Query validation middleware factory
 * Usage: router.get('/path', validateQuery(querySchema), handler);
 */
export const validateQuery = (schema: any) => (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    req.query = schema.parse(req.query);
    next();
  } catch (error) {
    next(error);
  }
};

export default errorHandler;
