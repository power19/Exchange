import { Router } from 'express';
import pool from '../database/connection';
import { BalanceService } from '../services/balanceService';
import { requirePattyOrBrian, requireDairimarOrBrian, requireBrianOrDairimar } from '../middleware/rbac';
import { orderLimiter, writeLimiter } from '../middleware/rateLimiter';
import { validators } from '../middleware/sanitize';
import { preventDuplicates } from '../middleware/idempotency';
import { logCreate, logFulfill, logUpdate, logCancel } from '../utils/auditHelper';
import { PushNotificationService } from '../services/pushNotificationService';

const router = Router();

// Get all VES orders (Brian and Dairimar can view)
router.get('/', requireBrianOrDairimar(), async (req, res, next) => {
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

// Create new VES order (Patty or Brian, with idempotency protection)
router.post('/', requirePattyOrBrian(), orderLimiter, preventDuplicates(), async (req, res, next) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { customer_name, amount_ves, date_submitted, bank, phone_number, customer_id, account_number } = req.body;

    // Enhanced validation with sanitizers
    const nameValidation = validators.customerName(customer_name);
    if (!nameValidation.valid) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: nameValidation.error });
    }

    const amountValidation = validators.amount(amount_ves, {
      min: 1,
      max: 10000000000, // 10 billion VES
      allowDecimals: false,
      fieldName: 'VES amount'
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
      `INSERT INTO ves_orders (date_submitted, customer_name, amount_ves, bank, phone_number, customer_id, account_number, status)
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

    // Send push notification to Brian and Dairimar
    await PushNotificationService.notifyNewVESOrder(result.rows[0]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Fulfill VES order (Dairimar or Brian - uses current rate or custom rate)
router.post('/:id/fulfill', requireDairimarOrBrian(), writeLimiter, async (req, res, next) => {
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

    // Check Dairimar's VES balance (WITHIN transaction to prevent race conditions)
    const daiVESBalance = await BalanceService.getDaiVESBalance(client);
    if (order.amount_ves > daiVESBalance) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Insufficient VES balance',
        current_balance: daiVESBalance,
        required: order.amount_ves
      });
    }

    // Calculate USDT sold
    const usdt_sold = order.amount_ves / rateValidation.value!;

    // Update order
    const result = await client.query(
      `UPDATE ves_orders
       SET status = 'COMPLETED',
           exchange_rate = $1,
           usdt_sold = $2,
           date_completed = $3
       WHERE id = $4
       RETURNING *`,
      [rateValidation.value, usdt_sold, date_completed || new Date(), id]
    );

    const fulfilledOrder = result.rows[0];

    await client.query('COMMIT');

    // Log the audit trail
    await logFulfill(
      req,
      'ves_orders',
      parseInt(id, 10),
      { status: order.status },
      {
        status: 'COMPLETED',
        exchange_rate: fulfilledOrder.exchange_rate,
        usdt_sold: fulfilledOrder.usdt_sold
      },
      `VES order fulfilled: ${fulfilledOrder.amount_ves} VES at rate ${fulfilledOrder.exchange_rate} = ${fulfilledOrder.usdt_sold} USDT`
    );

    // Send push notification to Brian and Patty
    await PushNotificationService.notifyVESOrderFulfilled(fulfilledOrder);

    res.json(fulfilledOrder);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

// Update VES order (Patty or Brian - can edit pending orders)
router.put('/:id', requirePattyOrBrian(), writeLimiter, async (req, res, next) => {
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

    if (amount_ves !== undefined) {
      const validation = validators.amount(amount_ves, {
        min: 1,
        max: 10000000000,
        allowDecimals: false,
        fieldName: 'VES amount'
      });
      if (!validation.valid) {
        await client.query('ROLLBACK');
        return res.status(400).json({ error: validation.error });
      }
      updates.push(`amount_ves = $${paramCount++}`);
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

// Cancel VES order (Patty or Brian - can cancel pending orders)
router.post('/:id/cancel', requirePattyOrBrian(), writeLimiter, async (req, res, next) => {
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
