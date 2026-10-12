/**
 * Centralized error-handling middleware.
 *
 * Instead of every route having its own try/catch with inline res.status().json(),
 * controllers simply throw errors or call next(err), and this middleware
 * formats a consistent JSON error envelope for the client.
 *
 * Must be registered AFTER all routes in app.js.
 */
import logger from "../config/logger.js";

/**
 * Custom operational error class.
 * Controllers throw this for known, expected failures (validation, not found, upstream down).
 * The error handler distinguishes these from unexpected crashes.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 handler for unmatched routes.
 * Placed after all route registrations to catch typos and invalid paths.
 */
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: "Not Found",
    detail: `No route matches ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Global error handler (Express error middleware signature: 4 params).
 *
 * Logs the error, then returns a clean JSON response.
 * Operational errors (AppError) expose the message to the client.
 * Unexpected errors send a generic "Internal Server Error" to avoid leaking internals.
 */
export function errorHandler(err, req, res, _next) {
  // Determine the HTTP status code
  const statusCode = err.statusCode || err.status || 500;

  // Log the error — operational errors at warn level, unexpected at error level
  if (err.isOperational) {
    logger.warn("%s %s → %d: %s", req.method, req.originalUrl, statusCode, err.message);
  } else {
    logger.error("Unexpected error on %s %s:", req.method, req.originalUrl, err);
  }

  res.status(statusCode).json({
    error: err.isOperational ? err.message : "Internal Server Error",
    ...(process.env.NODE_ENV !== "production" && { detail: err.message, stack: err.stack }),
  });
}
