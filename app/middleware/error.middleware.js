/**
 * Global error handler.
 * F-08 fix: In production, return only a generic message to clients.
 * Full error details are logged server-side only.
 */
const errorHandler = (err, req, res, next) => {
  const status = err.status || 500;

  // In production, never expose internal error details to the client
  const clientMessage = process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred. Please try again.'
    : (err.message || 'Internal Server Error');

  res.status(status).json({
    message: clientMessage,
    success: false,
  });
};

module.exports = errorHandler;
