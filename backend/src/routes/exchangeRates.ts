import { Router } from 'express';
import pool from '../database/connection';

const router = Router();

// Get current active rate for a currency
router.get('/current/:currency', async (req, res, next) => {
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

// Get all current active rates
router.get('/current', async (req, res, next) => {
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

// Get rate history for a currency
router.get('/history/:currency', async (req, res, next) => {
  try {
    const { currency } = req.params;
    const { limit = 10 } = req.query;

    if (!['VES', 'COP'].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid currency. Must be VES or COP' });
    }

    const result = await pool.query(
      `SELECT * FROM exchange_rates
       WHERE currency = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [currency.toUpperCase(), limit]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get today's rate history
router.get('/history/today/:currency', async (req, res, next) => {
  try {
    const { currency } = req.params;

    if (!['VES', 'COP'].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid currency. Must be VES or COP' });
    }

    const result = await pool.query(
      `SELECT r.*,
              (SELECT COUNT(*) FROM ves_orders
               WHERE exchange_rate = r.rate
               AND DATE(date_completed) = CURRENT_DATE) as orders_count
       FROM exchange_rates r
       WHERE currency = $1
       AND DATE(created_at) = CURRENT_DATE
       ORDER BY created_at DESC`,
      [currency.toUpperCase()]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Set new exchange rate (Admin only)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { currency, rate, set_by = 'admin' } = req.body;

    // Validation
    if (!currency || !['VES', 'COP'].includes(currency.toUpperCase())) {
      return res.status(400).json({ error: 'Valid currency required (VES or COP)' });
    }
    if (!rate || rate <= 0) {
      return res.status(400).json({ error: 'Valid rate required (must be > 0)' });
    }

    await client.query('BEGIN');

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
      [currency.toUpperCase(), rate, set_by]
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
