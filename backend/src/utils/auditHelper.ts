import { Request } from 'express';
import { AuditService, AuditAction } from '../services/auditService';
import { UserRole } from '../types';

/**
 * Extract IP address from request
 */
function getIpAddress(req: Request): string | undefined {
  // Check X-Forwarded-For header (for proxied requests)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0];
  }

  // Check X-Real-IP header
  const realIp = req.headers['x-real-ip'];
  if (realIp) {
    return typeof realIp === 'string' ? realIp : realIp[0];
  }

  // Fall back to connection remote address
  return req.socket.remoteAddress;
}

/**
 * Extract user agent from request
 */
function getUserAgent(req: Request): string | undefined {
  return req.headers['user-agent'];
}

/**
 * Helper to log audit events from routes
 *
 * @param req - Express request object
 * @param action - Action being performed
 * @param tableName - Table name being affected
 * @param recordId - ID of the record (optional)
 * @param options - Additional audit log options
 *
 * @example
 * await logAudit(req, 'CREATE', 'purchases', newPurchase.id, {
 *   newValues: { amount_usdt: 1000 },
 *   notes: 'Purchase created successfully'
 * });
 */
export async function logAudit(
  req: Request,
  action: AuditAction,
  tableName: string,
  recordId?: number,
  options?: {
    oldValues?: any;
    newValues?: any;
    notes?: string;
  }
): Promise<void> {
  const userRole = (req as any).userRole as UserRole | undefined;

  if (!userRole) {
    console.warn('Audit log: No user role found in request');
    return;
  }

  await AuditService.log({
    userRole,
    action,
    tableName,
    recordId,
    oldValues: options?.oldValues,
    newValues: options?.newValues,
    ipAddress: getIpAddress(req),
    userAgent: getUserAgent(req),
    notes: options?.notes
  });
}

/**
 * Helper to log CREATE actions
 */
export async function logCreate(
  req: Request,
  tableName: string,
  recordId: number,
  newValues?: any,
  notes?: string
): Promise<void> {
  await logAudit(req, 'CREATE', tableName, recordId, { newValues, notes });
}

/**
 * Helper to log UPDATE actions
 */
export async function logUpdate(
  req: Request,
  tableName: string,
  recordId: number,
  oldValues?: any,
  newValues?: any,
  notes?: string
): Promise<void> {
  await logAudit(req, 'UPDATE', tableName, recordId, { oldValues, newValues, notes });
}

/**
 * Helper to log DELETE actions
 */
export async function logDelete(
  req: Request,
  tableName: string,
  recordId: number,
  oldValues?: any,
  notes?: string
): Promise<void> {
  await logAudit(req, 'DELETE', tableName, recordId, { oldValues, notes });
}

/**
 * Helper to log FULFILL actions
 */
export async function logFulfill(
  req: Request,
  tableName: string,
  recordId: number,
  oldValues?: any,
  newValues?: any,
  notes?: string
): Promise<void> {
  await logAudit(req, 'FULFILL', tableName, recordId, { oldValues, newValues, notes });
}

/**
 * Helper to log CANCEL actions
 */
export async function logCancel(
  req: Request,
  tableName: string,
  recordId: number,
  oldValues?: any,
  notes?: string
): Promise<void> {
  await logAudit(req, 'CANCEL', tableName, recordId, { oldValues, notes });
}

/**
 * Helper to log APPROVE actions
 */
export async function logApprove(
  req: Request,
  tableName: string,
  recordId: number,
  notes?: string
): Promise<void> {
  await logAudit(req, 'APPROVE', tableName, recordId, { notes });
}

/**
 * Helper to log REJECT actions
 */
export async function logReject(
  req: Request,
  tableName: string,
  recordId: number,
  notes?: string
): Promise<void> {
  await logAudit(req, 'REJECT', tableName, recordId, { notes });
}
