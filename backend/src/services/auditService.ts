import pool from '../database/connection';

export interface AuditLogEntry {
  username: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  tableName: string;
  recordId: number;
  oldValues?: any;
  newValues?: any;
  notes?: string;
}

export class AuditService {
  /**
   * Log an audit entry to the audit_logs table
   */
  static async log(entry: AuditLogEntry): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query(
        `INSERT INTO audit_logs (username, action, table_name, record_id, old_values, new_values, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          entry.username,
          entry.action,
          entry.tableName,
          entry.recordId,
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.notes || null
        ]
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get audit history for a specific record
   */
  static async getHistory(tableName: string, recordId: number): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM audit_logs
         WHERE table_name = $1 AND record_id = $2
         ORDER BY timestamp DESC`,
        [tableName, recordId]
      );
      return result.rows;
    } finally {
      client.release();
    }
  }
}
