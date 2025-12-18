import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requireDairimarOrBrian, requireBrianOrDairimar } from '../middleware/rbac';
import { writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';

const router = Router();

// Get all conversions (Brian and Dairimar can view)
router.get('/', requireBrianOrDairimar(), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversions ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new conversion (Dairimar or Brian - USDT → VES)
router.post('/', requireDairimarOrBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { usdt_amount, exchange_rate, date } = req.body;

    // Enhanced validation
    const usdtValidation = validators.amount(usdt_amount, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'USDT amount'
    });

    if (!usdtValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: usdtValidation.error });
    }

    const rateValidation = validators.amount(exchange_rate, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'Exchange rate'
    });

    if (!rateValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: rateValidation.error });
    }

    // Check Dairimar's USDT balance
    const daiBalance = await BalanceService.getDaiUSDTBalance();
    if (usdtValidation.value! > daiBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient USDT balance',
        current_balance: daiBalance,
        requested: usdtValidation.value
      });
    }

    // Calculate VES received and round to integer (since VES is BIGINT, no decimals)
    const ves_received = Math.round(usdtValidation.value! * rateValidation.value!);

    const result = await client.query(
      `INSERT INTO conversions (date, usdt_amount, ves_received, exchange_rate)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date || new Date(), usdtValidation.value, ves_received, rateValidation.value]
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

export { router as conversionRoutes };
