import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

export function subdomainMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.get('host') || '';

  // Determine user role based on subdomain
  if (host.startsWith('powermental.') || host.startsWith('localhost')) {
    req.userRole = 'brian';
  } else if (host.startsWith('pato.')) {
    req.userRole = 'patty';
  } else if (host.startsWith('dai.')) {
    req.userRole = 'dairimar';
  } else {
    // Default to main dashboard for development
    req.userRole = 'brian';
  }

  next();
}
