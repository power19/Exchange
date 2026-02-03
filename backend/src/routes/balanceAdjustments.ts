import { Router } from 'express';
import pool from '../database/connection';
import { requireBrian } from '../middleware/rbac';
import { writeLimiter } from '../middleware/rateLimiter';
import { sanitizeString } from '../middleware/sanitize';
import { logCreate } from '../utils/auditHelper';
import { BalanceType } from '../types';

const router = Router();

const VALID_BALANCE_TYPES: BalanceType[] = ['brian_usdt', 'dai_usdt', 'dai_ves'];

// Helper to map balance_type to account + currency
function mapBalanceType(balanceType: BalanceType): { account: string; currency: string } {
  if (balanceType === 'brian_usdt') {
    return { account: 'brian', currency: 'USDT' };
  } else if (balanceType === 'dai_usdt') {
    return { account: 'dairimar', currency: 'USDT' };
  } else {
    return { account: 'dairimar', currency: 'VES' };
  }
}

// Helper to map account + currency back to balance_type
function mapToBalanceType(account: string, currency: string): BalanceType {
  if (account === 'brian' && currency === 'USDT') {
    return 'brian_usdt';
  } else if (account === 'dairimar' && currency === 'USDT') {
    return 'dai_usdt';
  } else {
    return 'dai_ves';
  }
}

// Get all balance adjustments (Brian only)
router.get('/', requireBrian(), async (req, res, next) => {
  try {
    const { balance_type } = req.query;

    let query = 'SELECT id, date, account, currency, adjustment_amount, reason, created_at FROM balance_adjustments';
    const params: any[] = [];

    if (balance_type && VALID_BALANCE_TYPES.includes(balance_type as BalanceType)) {
      const { account, currency } = mapBalanceType(balance_type as BalanceType);
      query += ' WHERE account = $1 AND currency = $2';
      params.push(account, currency);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);

    // Transform to frontend expected format
    const adjustments = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      balance_type: mapToBalanceType(row.account, row.currency),
      amount: parseFloat(row.adjustment_amount),
      reason: row.reason,
      adjusted_by: 'admin'
    }));

    res.json(adjustments);
  } catch (error) {
    next(error);
  }
});

// Create new balance adjustment (Brian only, with rate limiting)
router.post('/', requireBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { balance_type, amount, reason, date } = req.body;

    // Validate balance_type
    if (!balance_type || !VALID_BALANCE_TYPES.includes(balance_type)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Invalid balance_type. Must be one of: brian_usdt, dai_usdt, dai_ves'
      });
    }

    // Validate amount (can be positive or negative, but not zero)
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Amount must be a non-zero number (positive to add, negative to subtract)'
      });
    }

    // For VES adjustments, ensure it's an integer
    let finalAmount = amountNum;
    if (balance_type === 'dai_ves') {
      finalAmount = Math.round(amountNum);
    }

    // Validate and sanitize reason
    if (!reason || typeof reason !== 'string') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reason is required' });
    }

    const sanitizedReason = sanitizeString(reason, { maxLength: 500 });

    if (sanitizedReason.length < 3) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Reason must be at least 3 characters' });
    }

    // Map balance_type to account + currency for existing schema
    const { account, currency } = mapBalanceType(balance_type);

    const result = await client.query(
      `INSERT INTO balance_adjustments (date, account, currency, adjustment_amount, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [date || new Date(), account, currency, finalAmount, sanitizedReason]
    );

    const row = result.rows[0];

    await client.query('COMMIT');

    // Log the audit trail
    const actionType = finalAmount > 0 ? 'added to' : 'subtracted from';
    const absAmount = Math.abs(finalAmount);
    const balanceLabel = balance_type === 'brian_usdt' ? "Brian's USDT" :
                         balance_type === 'dai_usdt' ? "Dai's USDT" : "Dai's VES";

    await logCreate(req, 'balance_adjustments', row.id, {
      balance_type,
      amount: finalAmount,
      reason: sanitizedReason
    }, `${absAmount} ${actionType} ${balanceLabel}: ${sanitizedReason}`);

    // Return in frontend expected format
    res.status(201).json({
      id: row.id,
      date: row.date,
      balance_type,
      amount: parseFloat(row.adjustment_amount),
      reason: row.reason,
      adjusted_by: 'admin'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Delete a balance adjustment (Brian only, for corrections)
router.delete('/:id', requireBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get the adjustment first for audit logging
    const existing = await client.query(
      'SELECT * FROM balance_adjustments WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    const adjustment = existing.rows[0];

    await client.query('DELETE FROM balance_adjustments WHERE id = $1', [id]);

    await client.query('COMMIT');

    // Log the audit trail (using CREATE action since there's no DELETE in audit types)
    await logCreate(req, 'balance_adjustments', parseInt(id), {
      action: 'DELETE',
      deleted_adjustment: adjustment
    }, `Deleted adjustment: ${adjustment.adjustment_amount} for ${adjustment.account} ${adjustment.currency}`);

    res.json({ message: 'Adjustment deleted successfully', deleted: adjustment });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export { router as balanceAdjustmentRoutes };
