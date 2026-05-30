import { getMessage } from "../config/messages.js";

/**
 * Middleware for handling 404 errors
 * Called when no route matches the request
 */
export const notFound = (req, res, next) => {
  res.status(404);
  const error = new Error(getMessage("error", "generic"));
  error.statusCode = 404;
  error.expose = true;
  next(error);
};

/**
 * Global error handler middleware
 * Catches all errors thrown or passed to next() from other middlewares/handlers
 * Sends consistent JSON error response format
 */
export const errorHandler = (err, req, res, next) => {
  // Use status set by previous middleware, or default to 500
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  const clientMessage = err.expose || statusCode < 500
    ? err.message || getMessage("error", "generic")
    : getMessage("error", "generic");

  if (statusCode >= 500) {
    console.error("Internal error:", {
      message: err.message,
      stack: err.stack,
      path: req?.originalUrl,
      method: req?.method,
    });
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    // Include stack trace in development only
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
