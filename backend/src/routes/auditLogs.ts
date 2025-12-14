import { Router } from 'express';
import { AuditService, AuditQueryOptions } from '../services/auditService';
import { requireBrian } from '../middleware/rbac';
import { readLimiter, writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';

const router = Router();

/**
 * Get audit logs with optional filtering
 * Brian only - audit logs are sensitive administrative data
 */
router.get('/', requireBrian(), readLimiter, async (req, res, next) => {
  try {
    const {
      user_role,
      action,
      table_name,
      record_id,
      start_date,
      end_date,
      limit,
      offset
    } = req.query;

    // Build query options
    const options: AuditQueryOptions = {};

    if (user_role && typeof user_role === 'string') {
      if (!['brian', 'dairimar', 'patty', 'system'].includes(user_role)) {
        return res.status(400).json({ error: 'Invalid user_role' });
      }
      options.userRole = user_role as any;
    }

    if (action && typeof action === 'string') {
      if (!['CREATE', 'UPDATE', 'DELETE', 'FULFILL', 'CANCEL', 'APPROVE', 'REJECT'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action' });
      }
      options.action = action as any;
    }

    if (table_name && typeof table_name === 'string') {
      options.tableName = table_name;
    }

    if (record_id) {
      const id = parseInt(record_id as string, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: 'Invalid record_id' });
      }
      options.recordId = id;
    }

    if (start_date && typeof start_date === 'string') {
      const date = new Date(start_date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid start_date' });
      }
      options.startDate = date;
    }

    if (end_date && typeof end_date === 'string') {
      const date = new Date(end_date);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ error: 'Invalid end_date' });
      }
      options.endDate = date;
    }

    if (limit) {
      const lim = parseInt(limit as string, 10);
      if (isNaN(lim) || lim < 1 || lim > 1000) {
        return res.status(400).json({ error: 'Invalid limit (must be 1-1000)' });
      }
      options.limit = lim;
    } else {
      options.limit = 100; // Default limit
    }

    if (offset) {
      const off = parseInt(offset as string, 10);
      if (isNaN(off) || off < 0) {
        return res.status(400).json({ error: 'Invalid offset' });
      }
      options.offset = off;
    }

    // Get total count and logs
    const [logs, total] = await Promise.all([
      AuditService.query(options),
      AuditService.count(options)
    ]);

    res.json({
      logs,
      total,
      limit: options.limit,
      offset: options.offset || 0,
      has_more: (options.offset || 0) + logs.length < total
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get audit history for a specific record
 * Brian only
 */
router.get('/history/:table_name/:record_id', requireBrian(), readLimiter, async (req, res, next) => {
  try {
    const { table_name, record_id } = req.params;

    const id = parseInt(record_id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid record_id' });
    }

    const history = await AuditService.getHistory(table_name, id);
    res.json({ history, count: history.length });
  } catch (error) {
    next(error);
  }
});

/**
 * Get audit log statistics
 * Brian only - shows breakdown by role and action
 */
router.get('/stats', requireBrian(), readLimiter, async (req, res, next) => {
  try {
    const stats = await AuditService.getStats();

    // Transform stats into a more useful format
    const byRole: any = {};
    const byAction: any = {};
    let totalLogs = 0;

    stats.forEach((stat: any) => {
      const count = parseInt(stat.count, 10);
      totalLogs += count;

      // Group by role
      if (!byRole[stat.user_role]) {
        byRole[stat.user_role] = {
          total: 0,
          actions: {}
        };
      }
      byRole[stat.user_role].total += count;
      byRole[stat.user_role].actions[stat.action] = count;

      // Group by action
      if (!byAction[stat.action]) {
        byAction[stat.action] = {
          total: 0,
          roles: {}
        };
      }
      byAction[stat.action].total += count;
      byAction[stat.action].roles[stat.user_role] = count;
    });

    res.json({
      total_logs: totalLogs,
      by_role: byRole,
      by_action: byAction,
      raw_stats: stats
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Clean up old audit logs
 * Brian only - deletes logs older than specified days
 */
router.post('/cleanup', requireBrian(), writeLimiter, async (req, res, next) => {
  try {
    const { days_to_keep } = req.body;

    // Validate days_to_keep
    const daysValidation = validators.amount(days_to_keep, {
      min: 1,
      max: 3650, // Max 10 years
      allowDecimals: false,
      fieldName: 'Days to keep'
    });

    if (!daysValidation.valid) {
      return res.status(400).json({ error: daysValidation.error });
    }

    const deletedCount = await AuditService.cleanup(daysValidation.value!);

    // Log the cleanup action itself
    await AuditService.log({
      userRole: (req as any).userRole || 'system',
      action: 'DELETE',
      tableName: 'audit_logs',
      notes: `Cleaned up ${deletedCount} audit logs older than ${daysValidation.value} days`
    });

    res.json({
      message: `Successfully deleted ${deletedCount} old audit log entries`,
      deleted_count: deletedCount,
      days_kept: daysValidation.value
    });
  } catch (error) {
    next(error);
  }
});

export { router as auditLogRoutes };
