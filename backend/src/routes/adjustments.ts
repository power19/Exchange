import { Router } from 'express';
import pool from '../database/connection';
import { requireBrian } from '../middleware/rbac';

const router = Router();

// Get all balance adjustments (Brian only)
router.get('/', requireBrian(), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, date, account, currency, adjustment_amount, reason, created_at
       FROM balance_adjustments
       ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create a balance adjustment (Brian only)
router.post('/', requireBrian(), async (req, res, next) => {
  try {
    const { account, currency, adjustment_amount, reason } = req.body;

    // Validate account
    const validAccounts = ['brian', 'dairimar'];
    if (!validAccounts.includes(account)) {
      return res.status(400).json({
        error: `Invalid account. Must be one of: ${validAccounts.join(', ')}`
      });
    }

    // Validate currency
    const validCurrencies = ['USDT', 'VES'];
    if (!validCurrencies.includes(currency)) {
      return res.status(400).json({
        error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}`
      });
    }

    // Validate adjustment_amount (can be positive or negative)
    if (typeof adjustment_amount !== 'number' || isNaN(adjustment_amount)) {
      return res.status(400).json({ error: 'adjustment_amount must be a valid number' });
    }

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const result = await pool.query(
      `INSERT INTO balance_adjustments (account, currency, adjustment_amount, reason)
       VALUES ($1, $2, $3, $4)
       RETURNING id, date, account, currency, adjustment_amount, reason, created_at`,
      [account, currency, adjustment_amount, reason.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete a balance adjustment (Brian only)
router.delete('/:id', requireBrian(), async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM balance_adjustments WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Adjustment not found' });
    }

    res.json({ message: 'Adjustment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export { router as adjustmentsRoutes };
