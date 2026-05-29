/**
 * Middleware for handling 404 errors
 * Called when no route matches the request
 */
export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Not Found - ${req.originalUrl}`));
};

/**
 * Global error handler middleware
 * Catches all errors thrown or passed to next() from other middlewares/handlers
 * Sends consistent JSON error response format
 */
export const errorHandler = (err, req, res, next) => {
  // Use status set by previous middleware, or default to 500
  const statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Server Error",
    // Include stack trace in development only
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
