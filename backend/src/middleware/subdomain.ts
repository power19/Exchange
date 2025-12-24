import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';
import { isValidHost, getRoleFromHost } from '../config/security';

export function subdomainMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.get('host') || '';

  // Validate host header to prevent host header injection attacks
  if (process.env.NODE_ENV === 'production' && !isValidHost(host)) {
    console.warn(`⚠️ Rejected invalid host header: ${host}`);
    return res.status(400).json({ error: 'Invalid request' });
  }

  // Determine user role based on subdomain
  req.userRole = getRoleFromHost(host);

  next();
}
