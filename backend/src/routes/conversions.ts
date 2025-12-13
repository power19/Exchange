import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

const router = Router();

// Get all conversions
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversions ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new conversion (USDT → VES)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { usdt_amount, exchange_rate, date } = req.body;

    // Validation
    if (!usdt_amount || usdt_amount <= 0) {
      return res.status(400).json({ error: 'Invalid USDT amount' });
    }
    if (!exchange_rate || exchange_rate <= 0) {
      return res.status(400).json({ error: 'Invalid exchange rate' });
    }

    // Check Dairimar's USDT balance
    const daiBalance = await BalanceService.getDaiUSDTBalance();
    if (usdt_amount > daiBalance) {
      return res.status(400).json({
        error: 'Insufficient USDT balance',
        current_balance: daiBalance,
        requested: usdt_amount
      });
    }

    const ves_received = usdt_amount * exchange_rate;

    const result = await client.query(
      `INSERT INTO conversions (date, usdt_amount, ves_received, exchange_rate)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date || new Date(), usdt_amount, ves_received, exchange_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

export { router as conversionRoutes };
