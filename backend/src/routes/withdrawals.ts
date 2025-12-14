import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requireBrian } from '../middleware/rbac';
import { criticalLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';
import { logCreate } from '../utils/auditHelper';

const router = Router();

// Get all withdrawals (PRIVATE - Brian only)
router.get('/', requireBrian(), async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM withdrawals ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new withdrawal (PRIVATE - Brian only, with critical rate limiting)
router.post('/', requireBrian(), criticalLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { amount_usdt, notes, date } = req.body;

    // Enhanced validation
    const amountValidation = validators.amount(amount_usdt, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'Withdrawal amount'
    });

    if (!amountValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: amountValidation.error });
    }

    // Validate notes if provided
    const notesValidation = validators.notes(notes);
    if (!notesValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: notesValidation.error });
    }

    // Check available profit
    const profitData = await BalanceService.getProfitData();
    if (amountValidation.value! > profitData.available_profit) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient profit balance',
        available: profitData.available_profit,
        requested: amountValidation.value
      });
    }

    const result = await client.query(
      `INSERT INTO withdrawals (date, amount_usdt, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [date || new Date(), amountValidation.value, notesValidation.sanitized]
    );

    const withdrawal = result.rows[0];

    await client.query('COMMIT');

    // Log the audit trail (critical operation)
    await logCreate(
      req,
      'withdrawals',
      withdrawal.id,
      {
        amount_usdt: withdrawal.amount_usdt,
        notes: withdrawal.notes
      },
      `Profit withdrawal: ${withdrawal.amount_usdt} USDT`
    );

    res.status(201).json(withdrawal);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export { router as withdrawalRoutes };
