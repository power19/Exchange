import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all withdrawals (PRIVATE - requires authentication)
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM withdrawals ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new withdrawal (PRIVATE - requires authentication)
router.post('/', authMiddleware, async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount_usdt, notes, date } = req.body;

    // Validation
    if (!amount_usdt || amount_usdt <= 0) {
      return res.status(400).json({ error: 'Invalid withdrawal amount' });
    }

    // Check available profit
    const profitData = await BalanceService.getProfitData();
    if (amount_usdt > profitData.available_profit) {
      return res.status(400).json({
        error: 'Insufficient profit balance',
        available: profitData.available_profit,
        requested: amount_usdt
      });
    }

    const result = await client.query(
      `INSERT INTO withdrawals (date, amount_usdt, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [date || new Date(), amount_usdt, notes || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export { router as withdrawalRoutes };
