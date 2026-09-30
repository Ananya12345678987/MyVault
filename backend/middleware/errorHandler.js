/**
 * Centralized error handler. Keeps two promises from the spec:
 *  - never return stack traces to production clients
 *  - never leak whether an email exists, or other sensitive internals,
 *    through overly specific error messages (that's enforced at the
 *    controller level by always returning generic auth errors).
 */
function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.path}:`, err.message);

  // Zod validation errors have no .status and a JSON-array message —
  // turn the first issue into one readable sentence instead of
  // leaking the raw error shape to the client.
  if (err.name === "ZodError" && Array.isArray(err.issues)) {
    const first = err.issues[0];
    return res.status(400).json({
      error: first?.message || "Invalid input.",
    });
  }

  const status = err.status || 500;
  const isProd = process.env.NODE_ENV === "production";

  res.status(status).json({
    error: isProd && status === 500 ? "Something went wrong." : err.message,
  });
}

module.exports = errorHandler;
