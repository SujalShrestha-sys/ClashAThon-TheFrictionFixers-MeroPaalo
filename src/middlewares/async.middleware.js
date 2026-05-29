/**
 * Wrapper for async route handlers
 * Automatically catches promise rejections and passes them to the error handler
 * Use this to wrap all async controller functions to avoid try-catch blocks
 * Example: router.post("/action", protect, asyncHandler(myAsyncController))
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);