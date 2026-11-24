import rateLimit from 'express-rate-limit';

/**
 * Unlimited Rate Limiters across all portals (Admin, Client, Worker)
 * Completely eliminates 429 Too Many Requests errors.
 */
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10_000_000,
  message: { success: false, message: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // Completely unlimited for all requests across all portals
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10_000_000,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => true, // Completely unlimited for all auth attempts
});
