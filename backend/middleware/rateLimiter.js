const rateLimit = require("express-rate-limit");

/**
 * Stricter limiter for auth-sensitive endpoints (login, register,
 * vault unlock, password reset). General API traffic can use a
 * looser limiter defined separately if needed.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

module.exports = { authLimiter };
