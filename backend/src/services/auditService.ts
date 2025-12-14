import pool from '../database/connection';
import { UserRole } from '../types';

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'FULFILL' | 'CANCEL' | 'APPROVE' | 'REJECT';

export interface AuditLogEntry {
  userRole: UserRole | 'system';
  action: AuditAction;
  tableName: string;
  recordId?: number;
  oldValues?: any;
  newValues?: any;
  ipAddress?: string;
  userAgent?: string;
  notes?: string;
}

export interface AuditQueryOptions {
  userRole?: UserRole;
  action?: AuditAction;
  tableName?: string;
  recordId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export class AuditService {
  /**
   * Log an audit entry to the audit_logs table
   *
   * @param entry - Audit log entry details
   * @returns Promise<void>
   *
   * @example
   * await AuditService.log({
   *   userRole: 'brian',
   *   action: 'CREATE',
   *   tableName: 'purchases',
   *   recordId: 123,
   *   newValues: { amount_usdt: 1000 },
   *   ipAddress: '192.168.1.1',
   *   notes: 'Purchase created successfully'
   * });
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_role, action, table_name, record_id, old_values, new_values, ip_address, user_agent, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          entry.userRole,
          entry.action,
          entry.tableName,
          entry.recordId || null,
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.ipAddress || null,
          entry.userAgent || null,
          entry.notes || null
        ]
      );
    } catch (error) {
      // Log error but don't fail the main operation
      console.error('Audit logging failed:', error);
    }
  }

  /**
   * Get audit history for a specific record
   *
   * @param tableName - Table name to filter by
   * @param recordId - Record ID to filter by
   * @returns Promise<any[]>
   */
  static async getHistory(tableName: string, recordId: number): Promise<any[]> {
    const result = await pool.query(
      `SELECT * FROM audit_logs
       WHERE table_name = $1 AND record_id = $2
       ORDER BY timestamp DESC`,
      [tableName, recordId]
    );
    return result.rows;
  }

  /**
   * Query audit logs with various filters
   *
   * @param options - Query filter options
   * @returns Promise<any[]>
   *
   * @example
   * const logs = await AuditService.query({
   *   userRole: 'brian',
   *   action: 'CREATE',
   *   startDate: new Date('2024-01-01'),
   *   limit: 100
   * });
   */
  static async query(options: AuditQueryOptions = {}): Promise<any[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (options.userRole) {
      conditions.push(`user_role = $${paramCount++}`);
      params.push(options.userRole);
    }

    if (options.action) {
      conditions.push(`action = $${paramCount++}`);
      params.push(options.action);
    }

    if (options.tableName) {
      conditions.push(`table_name = $${paramCount++}`);
      params.push(options.tableName);
    }

    if (options.recordId) {
      conditions.push(`record_id = $${paramCount++}`);
      params.push(options.recordId);
    }

    if (options.startDate) {
      conditions.push(`timestamp >= $${paramCount++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`timestamp <= $${paramCount++}`);
      params.push(options.endDate);
    }

    let query = 'SELECT * FROM audit_logs';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY timestamp DESC';

    if (options.limit) {
      query += ` LIMIT $${paramCount++}`;
      params.push(options.limit);
    }

    if (options.offset) {
      query += ` OFFSET $${paramCount++}`;
      params.push(options.offset);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  /**
   * Get audit log statistics
   *
   * @returns Promise<any>
   */
  static async getStats(): Promise<any> {
    const result = await pool.query(`
      SELECT
        user_role,
        action,
        COUNT(*) as count
      FROM audit_logs
      GROUP BY user_role, action
      ORDER BY user_role, action
    `);
    return result.rows;
  }

  /**
   * Delete audit logs older than a specified number of days
   *
   * @param daysToKeep - Number of days to keep logs
   * @returns Promise<number> - Number of deleted rows
   *
   * @example
   * const deleted = await AuditService.cleanup(90); // Keep last 90 days
   */
  static async cleanup(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await pool.query(
      'DELETE FROM audit_logs WHERE timestamp < $1',
      [cutoffDate]
    );
    return result.rowCount || 0;
  }

  /**
   * Get total count of audit logs
   *
   * @param options - Optional filter options
   * @returns Promise<number>
   */
  static async count(options: AuditQueryOptions = {}): Promise<number> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (options.userRole) {
      conditions.push(`user_role = $${paramCount++}`);
      params.push(options.userRole);
    }

    if (options.action) {
      conditions.push(`action = $${paramCount++}`);
      params.push(options.action);
    }

    if (options.tableName) {
      conditions.push(`table_name = $${paramCount++}`);
      params.push(options.tableName);
    }

    if (options.startDate) {
      conditions.push(`timestamp >= $${paramCount++}`);
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push(`timestamp <= $${paramCount++}`);
      params.push(options.endDate);
    }

    let query = 'SELECT COUNT(*) as total FROM audit_logs';
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].total, 10);
  }
}
