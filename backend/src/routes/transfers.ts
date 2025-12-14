import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requireBrian, requireBrianOrDairimar } from '../middleware/rbac';
import { writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';

const router = Router();

// Get all transfers (Brian and Dairimar can view)
router.get('/', requireBrianOrDairimar(), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transfers ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new transfer (Brian only - Brian → Dairimar)
router.post('/', requireBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { amount_usdt, date } = req.body;

    // Enhanced validation
    const amountValidation = validators.amount(amount_usdt, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'Transfer amount'
    });

    if (!amountValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: amountValidation.error });
    }

    // Check Brian's balance
    const brianBalance = await BalanceService.getBrianBalance();
    if (amountValidation.value! > brianBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient balance',
        current_balance: brianBalance,
        requested: amountValidation.value
      });
    }

    const result = await client.query(
      `INSERT INTO transfers (date, amount_usdt)
       VALUES ($1, $2)
       RETURNING *`,
      [date || new Date(), amountValidation.value]
    );

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export { router as transferRoutes };
