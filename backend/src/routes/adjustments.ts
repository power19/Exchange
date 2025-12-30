import { Router } from 'express';
import pool from '../database/connection';
import { requireBrian } from '../middleware/rbac';

const router = Router();

// Get all balance adjustments (Brian only)
router.get('/', requireBrian(), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT id, date, account, amount, reason, created_by, created_at
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
    const { account, amount, reason } = req.body;

    // Validate account
    const validAccounts = ['brian_usdt', 'dai_usdt', 'dai_ves'];
    if (!validAccounts.includes(account)) {
      return res.status(400).json({
        error: `Invalid account. Must be one of: ${validAccounts.join(', ')}`
      });
    }

    // Validate amount (can be positive or negative)
    if (typeof amount !== 'number' || isNaN(amount)) {
      return res.status(400).json({ error: 'Amount must be a valid number' });
    }

    // Validate reason
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return res.status(400).json({ error: 'Reason is required' });
    }

    const result = await pool.query(
      `INSERT INTO balance_adjustments (account, amount, reason, created_by)
       VALUES ($1, $2, $3, 'admin')
       RETURNING id, date, account, amount, reason, created_by, created_at`,
      [account, amount, reason.trim()]
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
