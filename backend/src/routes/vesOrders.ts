import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';

const router = Router();

// Get all VES orders
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = 'SELECT * FROM ves_orders';
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

// Create new VES order (Patty submits)
router.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { customer_name, amount_ves, date_submitted, bank, phone_number, customer_id, account_number } = req.body;

    // Validation
    if (!customer_name || customer_name.trim() === '') {
      return res.status(400).json({ error: 'Customer name required' });
    }
    if (!amount_ves || amount_ves <= 0) {
      return res.status(400).json({ error: 'Invalid VES amount' });
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
      `INSERT INTO ves_orders (date_submitted, customer_name, amount_ves, bank, phone_number, customer_id, account_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [date_submitted || new Date(), customer_name, amount_ves, bank || null, phone_number || null, customer_id || null, account_number || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  } finally {
    client.release();
  }
});

// Fulfill VES order (Dairimar completes) - uses current rate or custom rate
router.post('/:id/fulfill', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { exchange_rate, date_completed } = req.body;

    // Get the order
    const orderResult = await client.query(
      'SELECT * FROM ves_orders WHERE id = $1',
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

    if (order.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot fulfill cancelled order' });
    }

    // Get exchange rate - use provided or get current active rate
    let finalRate = exchange_rate;
    if (!finalRate) {
      const rateResult = await client.query(
        'SELECT rate FROM exchange_rates WHERE currency = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
        ['VES']
      );

      if (rateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No active VES exchange rate set. Please set a rate first.' });
      }

      finalRate = parseFloat(rateResult.rows[0].rate);
    }

    // Validation
    if (finalRate <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid exchange rate' });
    }

    // Check Dairimar's VES balance
    const daiVESBalance = await BalanceService.getDaiVESBalance();
    if (order.amount_ves > daiVESBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient VES balance',
        current_balance: daiVESBalance,
        required: order.amount_ves
      });
    }

    // Calculate USDT sold
    const usdt_sold = order.amount_ves / finalRate;

    // Update order
    const result = await client.query(
      `UPDATE ves_orders
       SET status = 'COMPLETED',
           exchange_rate = $1,
           usdt_sold = $2,
           date_completed = $3
       WHERE id = $4
       RETURNING *`,
      [finalRate, usdt_sold, date_completed || new Date(), id]
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

// Update VES order (Patty can edit pending orders)
router.put('/:id', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { customer_name, amount_ves, bank, phone_number, customer_id, account_number } = req.body;

    // Get the order
    const orderResult = await client.query(
      'SELECT * FROM ves_orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only allow editing pending orders
    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only edit pending orders' });
    }

    // Validation
    if (customer_name !== undefined && customer_name.trim() === '') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Customer name cannot be empty' });
    }
    if (amount_ves !== undefined && amount_ves <= 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid VES amount' });
    }

    // Update only provided fields
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (customer_name !== undefined) {
      updates.push(`customer_name = $${paramCount++}`);
      values.push(customer_name);
    }
    if (amount_ves !== undefined) {
      updates.push(`amount_ves = $${paramCount++}`);
      values.push(amount_ves);
    }
    if (bank !== undefined) {
      updates.push(`bank = $${paramCount++}`);
      values.push(bank || null);
    }
    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramCount++}`);
      values.push(phone_number || null);
    }
    if (customer_id !== undefined) {
      updates.push(`customer_id = $${paramCount++}`);
      values.push(customer_id || null);
    }
    if (account_number !== undefined) {
      updates.push(`account_number = $${paramCount++}`);
      values.push(account_number || null);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await client.query(
      `UPDATE ves_orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      values
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

// Cancel VES order (Patty can cancel pending orders)
router.post('/:id/cancel', async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Get the order
    const orderResult = await client.query(
      'SELECT * FROM ves_orders WHERE id = $1',
      [id]
    );

    if (orderResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Only allow cancelling pending orders
    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only cancel pending orders' });
    }

    // Update order status to CANCELLED
    const result = await client.query(
      `UPDATE ves_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
      [id]
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

export { router as vesOrderRoutes };
