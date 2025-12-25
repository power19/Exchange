import { Router } from 'express';
import pool from '../database/connection';
import { requireBrianOrDairimar, requireAnyRole } from '../middleware/rbac';
import { writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';
import { getTodayDateString, toSurinameDate } from '../utils/dateUtils';

const router = Router();

// Get current active rate for a currency (accessible to all roles)
router.get('/current/:currency', requireAnyRole(), async (req, res, next) => {
  try {
    const { currency } = req.params;

    if (!['VES', 'COP'].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid currency. Must be VES or COP' });
    }

    const result = await pool.query(
      `SELECT * FROM exchange_rates
       WHERE currency = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [currency.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.json({ currency: currency.toUpperCase(), rate: null, message: 'No rate set' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get all current active rates (accessible to all roles)
router.get('/current', requireAnyRole(), async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (currency) *
       FROM exchange_rates
       WHERE is_active = true
       ORDER BY currency, created_at DESC`
    );

    const rates = {
      VES: result.rows.find(r => r.currency === 'VES') || null,
      COP: result.rows.find(r => r.currency === 'COP') || null
    };

    res.json(rates);
  } catch (error) {
    next(error);
  }
});

// Get rate history for a currency (Brian and Dairimar only)
router.get('/history/:currency', requireBrianOrDairimar(), async (req, res, next) => {
  try {
    const { currency } = req.params;
    const { limit = 10 } = req.query;

    if (!['VES', 'COP'].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid currency. Must be VES or COP' });
    }

    // Validate limit
    const limitValidation = validators.amount(limit, {
      min: 1,
      max: 100,
      allowDecimals: false,
      fieldName: 'Limit'
    });

    if (!limitValidation.valid) {
      return res.status(400).json({ error: limitValidation.error });
    }

    const result = await pool.query(
      `SELECT * FROM exchange_rates
       WHERE currency = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [currency.toUpperCase(), limitValidation.value]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get today's rate history (Brian and Dairimar only)
router.get('/history/today/:currency', requireBrianOrDairimar(), async (req, res, next) => {
  try {
    const { currency } = req.params;

    if (!['VES', 'COP'].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid currency. Must be VES or COP' });
    }

    const today = getTodayDateString();

    const result = await pool.query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM ves_orders
               WHERE exchange_rate = r.rate
               AND ${toSurinameDate('date_completed')} = $2) as orders_count
       FROM exchange_rates r
       WHERE currency = $1
       AND ${toSurinameDate('created_at')} = $2
       ORDER BY created_at DESC`,
      [currency.toUpperCase(), today]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Set new exchange rate (Brian and Dairimar only, with rate limiting)
router.post('/', requireBrianOrDairimar(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { currency, rate, set_by = 'admin' } = req.body;

    // Enhanced validation
    if (!currency || !['VES', 'COP'].includes(currency.toUpperCase())) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Valid currency required (VES or COP)' });
    }

    const rateValidation = validators.amount(rate, {
      min: 0.01,
      max: 10000000,
      allowDecimals: true,
      fieldName: 'Exchange rate'
    });

    if (!rateValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: rateValidation.error });
    }

    // Sanitize set_by
    const setByValidation = validators.customerName(set_by || 'admin');
    if (!setByValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid set_by value' });
    }

    // Deactivate all previous rates for this currency
    await client.query(
      'UPDATE exchange_rates SET is_active = false WHERE currency = $1 AND is_active = true',
      [currency.toUpperCase()]
    );

    // Insert new rate
    const result = await client.query(
      `INSERT INTO exchange_rates (currency, rate, set_by, is_active)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [currency.toUpperCase(), rateValidation.value, setByValidation.sanitized]
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

export { router as exchangeRatesRoutes };
