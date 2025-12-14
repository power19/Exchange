import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Idempotency Protection Middleware
 *
 * Prevents duplicate submissions by caching request signatures.
 * Critical for order submissions where double-clicks or network retries
 * could create duplicate orders.
 *
 * In production, use Redis instead of in-memory Map for:
 * - Persistence across server restarts
 * - Distributed systems support
 * - Better memory management
 */

interface CachedRequest {
  id: number | string;
  timestamp: number;
  response: any;
}

// In-memory cache (use Redis in production)
const requestCache = new Map<string, CachedRequest>();

// Cleanup interval - remove old entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  requestCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => requestCache.delete(key));

  if (keysToDelete.length > 0) {
    console.log(`[Idempotency] Cleaned up ${keysToDelete.length} expired cache entries`);
  }
}, CLEANUP_INTERVAL);

/**
 * Generate a unique hash for a request
 * Based on: user role + endpoint + request body
 */
function generateRequestHash(req: Request): string {
  const userRole = (req as any).userRole || 'unknown';
  const endpoint = `${req.method}:${req.path}`;
  const bodyString = JSON.stringify(req.body || {});

  const data = `${userRole}:${endpoint}:${bodyString}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Idempotency middleware for order submissions
 *
 * How it works:
 * 1. Hash the request (role + endpoint + body)
 * 2. Check if we've seen this exact request recently
 * 3. If yes, return the cached response (409 Conflict)
 * 4. If no, allow the request and cache the result
 *
 * @param options - Configuration options
 */
export function preventDuplicates(options: {
  window?: number; // Time window in ms (default: 5 minutes)
  message?: string; // Custom error message
} = {}) {
  const window = options.window || CACHE_TTL;
  const message = options.message || 'Duplicate request detected';

  return (req: Request, res: Response, next: NextFunction) => {
    const hash = generateRequestHash(req);
    const cached = requestCache.get(hash);
    const now = Date.now();

    // Check if we have a recent duplicate
    if (cached && (now - cached.timestamp) < window) {
      const age = Math.round((now - cached.timestamp) / 1000);
      console.warn(`[Idempotency] Duplicate request detected: ${hash.substring(0, 8)}... (${age}s ago)`);

      return res.status(409).json({
        error: 'Duplicate request',
        message: message,
        existing_id: cached.id,
        submitted_ago_seconds: age,
        details: 'This exact request was submitted recently. If you meant to submit a new order, please modify the details.'
      });
    }

    // Intercept the response to cache the created ID
    const originalJson = res.json.bind(res);
    res.json = function(body: any) {
      // Only cache successful creations (201 status)
      if (res.statusCode === 201 && body && body.id) {
        requestCache.set(hash, {
          id: body.id,
          timestamp: now,
          response: body
        });
        console.log(`[Idempotency] Cached request: ${hash.substring(0, 8)}... (ID: ${body.id})`);
      }
      return originalJson(body);
    };

    next();
  };
}

/**
 * Idempotency key-based approach (alternative)
 * Client provides an idempotency key in the header
 */
export function idempotencyKey(req: Request, res: Response, next: NextFunction) {
  const key = req.headers['idempotency-key'] as string;

  if (!key) {
    return res.status(400).json({
      error: 'Missing idempotency key',
      message: 'Please provide an Idempotency-Key header'
    });
  }

  // Validate key format (should be UUID or similar)
  if (key.length < 16 || key.length > 128) {
    return res.status(400).json({
      error: 'Invalid idempotency key',
      message: 'Idempotency key must be between 16 and 128 characters'
    });
  }

  const cached = requestCache.get(key);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.warn(`[Idempotency] Duplicate key: ${key}`);
    return res.status(200).json(cached.response); // Return original response
  }

  // Intercept response
  const originalJson = res.json.bind(res);
  res.json = function(body: any) {
    if (res.statusCode === 201) {
      requestCache.set(key, {
        id: body.id || 'unknown',
        timestamp: now,
        response: body
      });
    }
    return originalJson(body);
  };

  next();
}

/**
 * Clear all cached requests (for testing)
 */
export function clearIdempotencyCache() {
  const size = requestCache.size;
  requestCache.clear();
  console.log(`[Idempotency] Cleared ${size} cache entries`);
}

/**
 * Get cache statistics
 */
export function getIdempotencyCacheStats() {
  return {
    size: requestCache.size,
    oldest: Array.from(requestCache.values()).reduce((oldest, current) => {
      return !oldest || current.timestamp < oldest.timestamp ? current : oldest;
    }, null as CachedRequest | null)
  };
}
