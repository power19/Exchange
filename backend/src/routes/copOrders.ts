import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requirePattyOrBrian, requireBrian } from '../middleware/rbac';
import { orderLimiter, writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';
import { preventDuplicates } from '../middleware/idempotency';

const router = Router();

// Get all COP orders (Brian only - COP orders are private to Brian)
router.get('/', requireBrian(), async (req, res, next) => {
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

// Create new COP order (Patty or Brian, with idempotency protection)
router.post('/', requirePattyOrBrian(), orderLimiter, preventDuplicates(), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_name, amount_cop, date_submitted, bank, phone_number, customer_id, account_number } = req.body;

    // Enhanced validation with sanitizers
    const nameValidation = validators.customerName(customer_name);
    if (!nameValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: nameValidation.error });
    }

    const amountValidation = validators.amount(amount_cop, {
      min: 1,
      max: 100000000000, // 100 billion COP
      allowDecimals: false,
      fieldName: 'COP amount'
    });

    if (!amountValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: amountValidation.error });
    }

    // Validate optional fields
    const bankValidation = validators.bankName(bank);
    if (!bankValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: bankValidation.error });
    }

    const phoneValidation = validators.phoneNumber(phone_number);
    if (!phoneValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: phoneValidation.error });
    }

    const customerIdValidation = validators.customerId(customer_id);
    if (!customerIdValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: customerIdValidation.error });
    }

    const accountValidation = validators.accountNumber(account_number);
    if (!accountValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: accountValidation.error });
    }

    const result = await client.query(
      `INSERT INTO cop_orders (date_submitted, customer_name, amount_cop, bank, phone_number, customer_id, account_number, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'PENDING')
       RETURNING *`,
      [
        date_submitted || new Date(),
        nameValidation.sanitized,
        amountValidation.value,
        bankValidation.sanitized,
        phoneValidation.sanitized,
        customerIdValidation.sanitized,
        accountValidation.sanitized
      ]
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

// Fulfill COP order (Brian only - uses current rate or custom rate)
router.post('/:id/fulfill', requireBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { exchange_rate, date_completed } = req.body;

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

    if (order.status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Cannot fulfill cancelled order' });
    }

    // Get exchange rate - use provided or get current active rate
    let finalRate = exchange_rate;
    if (!finalRate) {
      const rateResult = await client.query(
        'SELECT rate FROM exchange_rates WHERE currency = $1 AND is_active = true ORDER BY created_at DESC LIMIT 1',
        ['COP']
      );

      if (rateResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: 'No active COP exchange rate set. Please set a rate first.' });
      }

      finalRate = parseFloat(rateResult.rows[0].rate);
    }

    // Enhanced validation
    const rateValidation = validators.amount(finalRate, {
      min: 0.01,
      max: 1000000,
      allowDecimals: true,
      fieldName: 'Exchange rate'
    });

    if (!rateValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: rateValidation.error });
    }

    // Calculate USDT sold
    const usdt_sold = order.amount_cop / rateValidation.value!;

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
      [rateValidation.value, usdt_sold, date_completed || new Date(), id]
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

// Update COP order (Patty or Brian - can edit pending orders)
router.put('/:id', requirePattyOrBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const { customer_name, amount_cop, bank, phone_number, customer_id, account_number } = req.body;

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

    // Only allow editing pending orders
    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only edit pending orders' });
    }

    // Validation with sanitizers
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (customer_name !== undefined) {
      const validation = validators.customerName(customer_name);
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`customer_name = $${paramCount++}`);
      values.push(validation.sanitized);
    }

    if (amount_cop !== undefined) {
      const validation = validators.amount(amount_cop, {
        min: 1,
        max: 100000000000,
        allowDecimals: false,
        fieldName: 'COP amount'
      });
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`amount_cop = $${paramCount++}`);
      values.push(validation.value);
    }

    if (bank !== undefined) {
      const validation = validators.bankName(bank);
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`bank = $${paramCount++}`);
      values.push(validation.sanitized);
    }

    if (phone_number !== undefined) {
      const validation = validators.phoneNumber(phone_number);
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`phone_number = $${paramCount++}`);
      values.push(validation.sanitized);
    }

    if (customer_id !== undefined) {
      const validation = validators.customerId(customer_id);
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`customer_id = $${paramCount++}`);
      values.push(validation.sanitized);
    }

    if (account_number !== undefined) {
      const validation = validators.accountNumber(account_number);
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`account_number = $${paramCount++}`);
      values.push(validation.sanitized);
    }

    if (updates.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    const result = await client.query(
      `UPDATE cop_orders SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
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

// Cancel COP order (Patty or Brian - can cancel pending orders)
router.post('/:id/cancel', requirePattyOrBrian(), writeLimiter, async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

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

    // Only allow cancelling pending orders
    if (order.status !== 'PENDING') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Can only cancel pending orders' });
    }

    // Update order status to CANCELLED
    const result = await client.query(
      `UPDATE cop_orders SET status = 'CANCELLED' WHERE id = $1 RETURNING *`,
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

export { router as copOrderRoutes };
