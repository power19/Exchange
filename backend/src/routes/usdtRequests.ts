import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requireDairimarOrBrian, requireBrian } from '../middleware/rbac';
import { orderLimiter, writeLimiter, criticalLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';
import { logCreate, logApprove, logReject } from '../utils/auditHelper';
import { PushNotificationService } from '../services/pushNotificationService';

const router = Router();

/**
 * Get all USDT requests
 * - Dairimar sees only their own requests
 * - Brian sees all requests
 */
router.get('/', requireDairimarOrBrian(), async (req, res, next) => {
  try {
    const { status } = req.query;
    const userRole = (req as any).userRole;

    let query = 'SELECT * FROM usdt_requests';
    const params: any[] = [];

    // Filter by status if provided
    if (status) {
      if (!['PENDING', 'FULFILLED', 'REJECTED'].includes(status as string)) {
        return res.status(400).json({ error: 'Invalid status. Must be PENDING, FULFILLED, or REJECTED' });
      }
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY date_requested DESC';

    const result = await pool.query(query, params);

    // Note: Since all requests are from Dairimar, no need to filter by requester
    // But we could add a `requested_by` field in the future if needed
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * Create new USDT request
 * Dairimar or Brian can create requests (Brian has admin override)
 * Typically Dairimar requests USDT when running low
 */
router.post('/', requireDairimarOrBrian(), orderLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { amount_usdt, reason, date_requested } = req.body;

    // Enhanced validation
    const amountValidation = validators.amount(amount_usdt, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'USDT amount'
    });

    if (!amountValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: amountValidation.error });
    }

    // Validate reason (required, meaningful text)
    const reasonValidation = validators.notes(reason);
    if (!reasonValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reason is required and must be valid text' });
    }

    if (!reasonValidation.sanitized || reasonValidation.sanitized.length < 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reason must be at least 5 characters long' });
    }

    // Create the request
    const result = await client.query(
      `INSERT INTO usdt_requests (date_requested, amount_usdt, reason, status)
       VALUES ($1, $2, $3, 'PENDING')
       RETURNING *`,
      [date_requested || new Date(), amountValidation.value, reasonValidation.sanitized]
    );

    const request = result.rows[0];

    await client.query('COMMIT');

    // Send push notification to Brian
    await PushNotificationService.notifyUSDTRequested(request);

    // Log the audit trail
    await logCreate(
      req,
      'usdt_requests',
      request.id,
      {
        amount_usdt: request.amount_usdt,
        reason: request.reason
      },
      `USDT request created: ${request.amount_usdt} USDT - Reason: ${request.reason.substring(0, 50)}...`
    );

    res.status(201).json(request);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Approve USDT request
 * Brian only - Approves request and automatically creates transfer
 * This is a critical operation with multiple steps:
 * 1. Validate Brian has sufficient USDT balance
 * 2. Update request status to FULFILLED
 * 3. Create transfer from Brian to Dairimar
 * 4. Log audit trail
 */
router.post('/:id/approve', requireBrian(), criticalLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { notes } = req.body;

    // Get the request
    const requestResult = await client.query(
      'SELECT * FROM usdt_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Check if already processed
    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Request already ${request.status.toLowerCase()}`,
        current_status: request.status
      });
    }

    // Validate notes if provided
    let sanitizedNotes = null;
    if (notes) {
      const notesValidation = validators.notes(notes);
      if (!notesValidation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: notesValidation.error });
      }
      sanitizedNotes = notesValidation.sanitized;
    }

    // Check Brian's USDT balance (WITHIN transaction to prevent race conditions)
    const brianBalance = await BalanceService.getBrianBalance(client);
    if (request.amount_usdt > brianBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient USDT balance',
        current_balance: brianBalance,
        requested: request.amount_usdt,
        shortfall: request.amount_usdt - brianBalance
      });
    }

    // Update request status to FULFILLED
    const updateResult = await client.query(
      `UPDATE usdt_requests
       SET status = 'FULFILLED',
           date_resolved = $1,
           notes = $2
       WHERE id = $3
       RETURNING *`,
      [new Date(), sanitizedNotes, id]
    );

    const fulfilledRequest = updateResult.rows[0];

    // Automatically create transfer from Brian to Dairimar
    const transferResult = await client.query(
      `INSERT INTO transfers (date, amount_usdt)
       VALUES ($1, $2)
       RETURNING *`,
      [new Date(), request.amount_usdt]
    );

    const transfer = transferResult.rows[0];

    await client.query('COMMIT');

    // Send push notification to Dairimar
    await PushNotificationService.notifyUSDTTransferApproved(transfer);

    // Log the audit trail for approval
    await logApprove(
      req,
      'usdt_requests',
      parseInt(id, 10),
      `USDT request approved: ${fulfilledRequest.amount_usdt} USDT transferred to Dairimar (Transfer ID: ${transfer.id})`
    );

    res.json({
      request: fulfilledRequest,
      transfer: transfer,
      message: `Request approved. ${transfer.amount_usdt} USDT transferred to Dairimar.`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Reject USDT request
 * Brian only - Rejects request with reason
 */
router.post('/:id/reject', requireBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { notes } = req.body;

    // Get the request
    const requestResult = await client.query(
      'SELECT * FROM usdt_requests WHERE id = $1',
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestResult.rows[0];

    // Check if already processed
    if (request.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Request already ${request.status.toLowerCase()}`,
        current_status: request.status
      });
    }

    // Validate rejection reason (required for reject)
    const notesValidation = validators.notes(notes);
    if (!notesValidation.valid || !notesValidation.sanitized) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    if (notesValidation.sanitized.length < 5) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Rejection reason must be at least 5 characters long' });
    }

    // Update request status to REJECTED
    const result = await client.query(
      `UPDATE usdt_requests
       SET status = 'REJECTED',
           date_resolved = $1,
           notes = $2
       WHERE id = $3
       RETURNING *`,
      [new Date(), notesValidation.sanitized, id]
    );

    const rejectedRequest = result.rows[0];

    await client.query('COMMIT');

    // Send push notification to Dairimar
    await PushNotificationService.notifyUSDTRequestRejected(rejectedRequest);

    // Log the audit trail
    await logReject(
      req,
      'usdt_requests',
      parseInt(id, 10),
      `USDT request rejected: ${rejectedRequest.amount_usdt} USDT - Reason: ${rejectedRequest.notes}`
    );

    res.json(rejectedRequest);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

/**
 * Get request statistics
 * Brian only - View statistics about USDT requests
 */
router.get('/stats', requireBrian(), async (req, res, next) => {
  try {
    const statsResult = await pool.query(`
      SELECT
        status,
        COUNT(*) as count,
        COALESCE(SUM(amount_usdt), 0) as total_amount
      FROM usdt_requests
      GROUP BY status
      ORDER BY status
    `);

    const stats: any = {
      total_requests: 0,
      total_amount_requested: 0,
      by_status: {}
    };

    statsResult.rows.forEach((row: any) => {
      stats.total_requests += parseInt(row.count, 10);
      stats.total_amount_requested += parseFloat(row.total_amount);
      stats.by_status[row.status] = {
        count: parseInt(row.count, 10),
        total_amount: parseFloat(row.total_amount)
      };
    });

    // Get pending requests count
    const pendingResult = await pool.query(
      "SELECT COUNT(*) as count, COALESCE(SUM(amount_usdt), 0) as total FROM usdt_requests WHERE status = 'PENDING'"
    );

    stats.pending = {
      count: parseInt(pendingResult.rows[0].count, 10),
      total_amount: parseFloat(pendingResult.rows[0].total)
    };

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export { router as usdtRequestRoutes };
