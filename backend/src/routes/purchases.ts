import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

const router = Router();

// Get all purchases
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM purchases ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new purchase
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount_usdt, fee_percentage, date } = req.body;

    // Validation
    if (!amount_usdt || amount_usdt <= 0) {
      return res.status(400).json({ error: 'Invalid USDT amount' });
    }
    if (fee_percentage === undefined || fee_percentage < 0 || fee_percentage > 1) {
      return res.status(400).json({ error: 'Fee percentage must be between 0 and 1' });
    }

    const total_cost_usd = amount_usdt * (1 + fee_percentage);

    const result = await client.query(
      `INSERT INTO purchases (date, amount_usdt, fee_percentage, total_cost_usd)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date || new Date(), amount_usdt, fee_percentage, total_cost_usd]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export { router as purchaseRoutes };
