import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware
 *
 * Protects against:
 * - Brute force attacks
 * - DoS attacks
 * - Resource exhaustion
 * - Spam/abuse
 */

/**
 * Strict rate limiter for authentication endpoints
 * 5 attempts per 15 minutes per IP
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    error: 'Too many login attempts',
    message: 'Please try again after 15 minutes',
    retryAfter: '15 minutes'
  },
  skipSuccessfulRequests: false
});

/**
 * Moderate rate limiter for write operations
 * 30 requests per minute per IP
 */
export const writeLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'You are making too many changes. Please slow down.',
    retryAfter: '1 minute'
  },
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Lenient rate limiter for read operations
 * 100 requests per minute per IP
 */
export const readLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'You are making too many requests. Please slow down.',
    retryAfter: '1 minute'
  },
  skipSuccessfulRequests: true
});

/**
 * Global API rate limiter
 * 200 requests per minute per IP (across all endpoints)
 */
export const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 200, // 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    message: 'API rate limit exceeded. Please slow down.',
    retryAfter: '1 minute'
  },
  skip: (req) => {
    // Skip rate limiting for health check
    return req.path === '/health';
  }
});

/**
 * Strict limiter for order submission
 * 10 orders per minute per IP (prevents spam)
 */
export const orderLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 orders per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many orders submitted',
    message: 'You are submitting orders too quickly. Please wait a moment.',
    retryAfter: '1 minute'
  }
});

/**
 * Very strict limiter for critical operations
 * 5 requests per 5 minutes per IP
 */
export const criticalLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // 5 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many critical operations',
    message: 'You are performing critical operations too frequently. Please wait.',
    retryAfter: '5 minutes'
  }
});

/**
 * Custom rate limiter factory
 * Create custom rate limiters with specific parameters
 */
export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Rate limit exceeded',
      message: options.message || 'Too many requests. Please try again later.',
      retryAfter: `${options.windowMs / 1000} seconds`
    }
  });
}
