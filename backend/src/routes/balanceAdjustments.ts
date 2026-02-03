import { Router } from 'express';
import pool from '../database/connection';
import { requireBrian } from '../middleware/rbac';
import { writeLimiter } from '../middleware/rateLimiter';
import { sanitizeString } from '../middleware/sanitize';
import { logCreate } from '../utils/auditHelper';
import { BalanceType } from '../types';

const router = Router();

const VALID_BALANCE_TYPES: BalanceType[] = ['brian_usdt', 'dai_usdt', 'dai_ves'];

// Get all balance adjustments (Brian only)
router.get('/', requireBrian(), async (req, res, next) => {
  try {
    const { balance_type } = req.query;

    let query = 'SELECT * FROM balance_adjustments';
    const params: any[] = [];

    if (balance_type && VALID_BALANCE_TYPES.includes(balance_type as BalanceType)) {
      query += ' WHERE balance_type = $1';
      params.push(balance_type);
    }

    query += ' ORDER BY date DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
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

    const result = await client.query(
      `INSERT INTO balance_adjustments (date, balance_type, amount, reason, adjusted_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [date || new Date(), balance_type, finalAmount, sanitizedReason, 'admin']
    );

    const adjustment = result.rows[0];

    await client.query('COMMIT');

    // Log the audit trail
    const actionType = finalAmount > 0 ? 'added to' : 'subtracted from';
    const absAmount = Math.abs(finalAmount);
    const balanceLabel = balance_type === 'brian_usdt' ? "Brian's USDT" :
                         balance_type === 'dai_usdt' ? "Dai's USDT" : "Dai's VES";

    await logCreate(req, 'balance_adjustments', adjustment.id, {
      balance_type,
      amount: finalAmount,
      reason: sanitizedReason
    }, `${absAmount} ${actionType} ${balanceLabel}: ${sanitizedReason}`);

    res.status(201).json(adjustment);
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
    }, `Deleted adjustment: ${adjustment.amount} for ${adjustment.balance_type}`);

    res.json({ message: 'Adjustment deleted successfully', deleted: adjustment });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export { router as balanceAdjustmentRoutes };
