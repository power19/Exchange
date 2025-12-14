import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requireBrian, requireBrianOrDairimar } from '../middleware/rbac';
import { writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';
import { logCreate } from '../utils/auditHelper';

const router = Router();

// Get all purchases (Brian and Dairimar can view)
router.get('/', requireBrianOrDairimar(), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM purchases ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new purchase (Brian only, with rate limiting)
router.post('/', requireBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { amount_usdt, fee_percentage, date } = req.body;

    // Enhanced validation with sanitization
    const amountValidation = validators.amount(amount_usdt, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'USDT amount'
    });

    if (!amountValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: amountValidation.error });
    }

    const feeValidation = validators.amount(fee_percentage, {
      min: 0,
      max: 1,
      allowDecimals: true,
      fieldName: 'Fee percentage'
    });

    if (!feeValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: feeValidation.error });
    }

    const total_cost_usd = amountValidation.value! * (1 + feeValidation.value!);

    const result = await client.query(
      `INSERT INTO purchases (date, amount_usdt, fee_percentage, total_cost_usd)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [date || new Date(), amountValidation.value, feeValidation.value, total_cost_usd]
    );

    const purchase = result.rows[0];

    await client.query('COMMIT');

    // Log the audit trail
    await logCreate(req, 'purchases', purchase.id, {
      amount_usdt: purchase.amount_usdt,
      fee_percentage: purchase.fee_percentage,
      total_cost_usd: purchase.total_cost_usd
    }, `Purchase of ${purchase.amount_usdt} USDT with ${(purchase.fee_percentage * 100).toFixed(2)}% fee`);

    res.status(201).json(purchase);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export { router as purchaseRoutes };
