import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

const router = Router();

// Get all transfers
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM transfers ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new transfer (Brian → Dairimar)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { amount_usdt, date } = req.body;

    // Validation
    if (!amount_usdt || amount_usdt <= 0) {
      return res.status(400).json({ error: 'Invalid USDT amount' });
    }

    // Check Brian's balance
    const brianBalance = await BalanceService.getBrianBalance();
    if (amount_usdt > brianBalance) {
      return res.status(400).json({
        error: 'Insufficient balance',
        current_balance: brianBalance,
        requested: amount_usdt
      });
    }

    const result = await client.query(
      `INSERT INTO transfers (date, amount_usdt)
       VALUES ($1, $2)
       RETURNING *`,
      [date || new Date(), amount_usdt]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export { router as transferRoutes };
