import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

const router = Router();

// Get all COP orders
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM cop_orders';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }

    query += ' ORDER BY date_submitted DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create new COP order (Patty submits)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { customer_name, amount_cop, date_submitted, bank, phone_number, customer_id, account_number } = req.body;

    // Validation
    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({ error: 'Customer name required' });
    }
    if (!amount_cop || amount_cop <= 0) {
      return res.status(400).json({ error: 'Invalid COP amount' });
    }

    // Validate optional fields (reject empty strings)
    if (bank !== undefined && bank !== null && bank.trim() === '') {
      return res.status(400).json({ error: 'Bank cannot be empty if provided' });
    }
    if (phone_number !== undefined && phone_number !== null && phone_number.trim() === '') {
      return res.status(400).json({ error: 'Phone number cannot be empty if provided' });
    }
    if (customer_id !== undefined && customer_id !== null && customer_id.trim() === '') {
      return res.status(400).json({ error: 'Customer ID cannot be empty if provided' });
    }
    if (account_number !== undefined && account_number !== null && account_number.trim() === '') {
      return res.status(400).json({ error: 'Account number cannot be empty if provided' });
    }

    const result = await client.query(
      `INSERT INTO cop_orders (date_submitted, customer_name, amount_cop, bank, phone_number, customer_id, account_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [date_submitted || new Date(), customer_name, amount_cop, bank || null, phone_number || null, customer_id || null, account_number || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

// Fulfill COP order (Brian completes)
router.post('/:id/fulfill', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { exchange_rate, date_completed } = req.body;

    // Validation
    if (!exchange_rate || exchange_rate <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid exchange rate' });
    }

    // Get the order
    const orderResult = await client.query(
      'SELECT * FROM cop_orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    if (order.status === 'COMPLETED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Order already completed' });
    }

    // Calculate USDT sold
    const usdt_sold = order.amount_cop / exchange_rate;

    // Check Brian's USDT balance
    const brianBalance = await BalanceService.getBrianBalance();
    if (usdt_sold > brianBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient USDT balance',
        current_balance: brianBalance,
        required: usdt_sold
      });
    }

    // Update order
    const result = await client.query(
      `UPDATE cop_orders
       SET status = 'COMPLETED',
           exchange_rate = $1,
           usdt_sold = $2,
           date_completed = $3
       WHERE id = $4
       RETURNING *`,
      [exchange_rate, usdt_sold, date_completed || new Date(), id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

export { router as copOrderRoutes };
