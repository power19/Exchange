import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../types';

/**
 * Role-Based Access Control Middleware
 *
 * Restricts endpoint access based on user roles determined by subdomain.
 * This prevents unauthorized actions (e.g., Patty creating USDT purchases).
 */

export interface RBACRequest extends Request {
  userRole?: UserRole;
}

/**
 * Require specific role(s) to access an endpoint
 *
 * @param allowedRoles - Array of roles that can access this endpoint
 * @returns Express middleware function
 *
 * @example
 * router.post('/purchases', requireRole(['brian']), async (req, res) => { ... });
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: RBACRequest, res: Response, next: NextFunction) => {
    const userRole = req.userRole;

    // If no role is set (shouldn't happen with subdomain middleware)
    if (!userRole) {
      console.error('RBAC: No user role set on request');
      return res.status(403).json({
        error: 'Access denied',
        message: 'User role not determined'
      });
    }

    // Check if user's role is in allowed list
    if (!roles.includes(userRole)) {
      console.warn(`RBAC: User with role "${userRole}" attempted to access endpoint requiring ${roles.join(' or ')}`);
      return res.status(403).json({
        error: 'Access denied',
        message: `This action is restricted to ${roles.join(' or ')} only`,
        your_role: userRole,
        required_role: roles
      });
    }

    // Role is allowed, proceed
    next();
  };
}

/**
 * Require Brian (owner) role
 * Shorthand for requireRole('brian')
 */
export const requireBrian = () => requireRole('brian');

/**
 * Require Dairimar (VES handler) role
 * Shorthand for requireRole('dairimar')
 */
export const requireDairimar = () => requireRole('dairimar');

/**
 * Require Patty (customer acquisition) role
 * Shorthand for requireRole('patty')
 */
export const requirePatty = () => requireRole('patty');

/**
 * Allow Brian or Dairimar (excludes Patty)
 */
export const requireBrianOrDairimar = () => requireRole(['brian', 'dairimar']);

/**
 * Allow any authenticated role (all three roles)
 * Useful for read-only endpoints that should be accessible to everyone
 */
export const requireAnyRole = () => requireRole(['brian', 'dairimar', 'patty']);

/**
 * Allow Patty or Brian (Brian has admin override for order management)
 */
export const requirePattyOrBrian = () => requireRole(['patty', 'brian']);

/**
 * Allow Dairimar or Brian (Brian has admin override for VES operations)
 */
export const requireDairimarOrBrian = () => requireRole(['dairimar', 'brian']);

/**
 * Log access attempts for auditing
 * Can be used before requireRole to track all access attempts
 */
export function logAccess(req: RBACRequest, res: Response, next: NextFunction) {
  const timestamp = new Date().toISOString();
  const userRole = req.userRole || 'unknown';
  const endpoint = `${req.method} ${req.path}`;

  console.log(`[${timestamp}] ACCESS: ${userRole} → ${endpoint}`);
  next();
}
