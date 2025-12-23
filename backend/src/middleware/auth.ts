import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/security';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Try to get token from HttpOnly cookie first, then from Authorization header (backward compatibility)
    const cookieToken = req.cookies?.[jwtConfig.cookieName];
    const headerToken = req.headers.authorization?.split(' ')[1];
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as { username: string; role: string };

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Attach user info to request for downstream use
    (req as any).user = decoded;

    next();
  } catch (error) {
    // Clear invalid cookie if present
    res.clearCookie(jwtConfig.cookieName, { path: '/' });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to verify CSRF token for state-changing requests
export function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip CSRF check for GET, HEAD, OPTIONS requests (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for login (user doesn't have CSRF token yet)
  if (req.path === '/auth/login') {
    return next();
  }

  // Check if user is authenticated (has auth cookie)
  const authToken = req.cookies?.[jwtConfig.cookieName];
  if (!authToken) {
    // Not authenticated, skip CSRF (will be caught by auth middleware if needed)
    return next();
  }

  // Verify CSRF token
  const csrfHeader = req.headers['x-csrf-token'] as string;
  const csrfCookie = req.cookies?.['csrf_token'];

  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}
