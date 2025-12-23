import { Router } from 'express';
import pool from '../database/connection';
import { requireBrian } from '../middleware/rbac';

const router = Router();

// Get daily report (PRIVATE - Brian only, contains profit data)
router.get('/daily', requireBrian(), async (req, res, next) => {
  try {
    const { date } = req.query;

    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get VES orders for the day
    const vesOrdersResult = await pool.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(amount_ves), 0) as total_ves,
        COALESCE(SUM(usdt_sold), 0) as total_usdt
       FROM ves_orders
       WHERE DATE(date_completed) = $1
       AND status = 'COMPLETED'`,
      [targetDate]
    );

    // Get COP orders for the day
    const copOrdersResult = await pool.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(amount_cop), 0) as total_cop,
        COALESCE(SUM(usdt_sold), 0) as total_usdt
       FROM cop_orders
       WHERE DATE(date_completed) = $1
       AND status = 'COMPLETED'`,
      [targetDate]
    );

    // Get purchases for the day
    const purchasesResult = await pool.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(amount_usdt), 0) as total_usdt,
        COALESCE(SUM(total_cost_usd), 0) as total_cost
       FROM purchases
       WHERE DATE(date) = $1`,
      [targetDate]
    );

    // Get transfers for the day
    const transfersResult = await pool.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(amount_usdt), 0) as total_usdt
       FROM transfers
       WHERE DATE(date) = $1`,
      [targetDate]
    );

    // Get conversions for the day
    const conversionsResult = await pool.query(
      `SELECT
        COUNT(*) as count,
        COALESCE(SUM(usdt_amount), 0) as total_usdt,
        COALESCE(SUM(ves_received), 0) as total_ves
       FROM conversions
       WHERE DATE(date) = $1`,
      [targetDate]
    );

    // Calculate starting balances (balance at start of target date)
    // This is the balance BEFORE any transactions on target date
    const startingBalancesResult = await pool.query(
      `SELECT
        -- Brian's USDT starting balance
        (SELECT COALESCE(SUM(amount_usdt), 0) FROM purchases WHERE DATE(date) < $1) -
        (SELECT COALESCE(SUM(amount_usdt), 0) FROM transfers WHERE DATE(date) < $1) -
        (SELECT COALESCE(SUM(usdt_sold), 0) FROM cop_orders WHERE status = 'COMPLETED' AND DATE(date_completed) < $1) as brian_usdt_start,

        -- Dairimar's USDT starting balance
        (SELECT COALESCE(SUM(amount_usdt), 0) FROM transfers WHERE DATE(date) < $1) -
        (SELECT COALESCE(SUM(usdt_amount), 0) FROM conversions WHERE DATE(date) < $1) as dai_usdt_start,

        -- Dairimar's VES starting balance
        (SELECT COALESCE(SUM(ves_received), 0) FROM conversions WHERE DATE(date) < $1) -
        (SELECT COALESCE(SUM(amount_ves), 0) FROM ves_orders WHERE status = 'COMPLETED' AND DATE(date_completed) < $1) as dai_ves_start`,
      [targetDate]
    );

    const startingBalances = startingBalancesResult.rows[0];

    const report = {
      date: targetDate,
      starting_balances: {
        brian_usdt: parseFloat(startingBalances.brian_usdt_start) || 0,
        dai_usdt: parseFloat(startingBalances.dai_usdt_start) || 0,
        dai_ves: parseInt(startingBalances.dai_ves_start, 10) || 0
      },
      ves_orders: {
        count: parseInt(vesOrdersResult.rows[0].count),
        total_ves: parseInt(vesOrdersResult.rows[0].total_ves) || 0,
        total_usdt: parseFloat(vesOrdersResult.rows[0].total_usdt) || 0
      },
      cop_orders: {
        count: parseInt(copOrdersResult.rows[0].count),
        total_cop: parseInt(copOrdersResult.rows[0].total_cop) || 0,
        total_usdt: parseFloat(copOrdersResult.rows[0].total_usdt) || 0
      },
      total_usdt_sold: (parseFloat(vesOrdersResult.rows[0].total_usdt) || 0) +
                       (parseFloat(copOrdersResult.rows[0].total_usdt) || 0),
      purchases: {
        count: parseInt(purchasesResult.rows[0].count),
        total_usdt: parseFloat(purchasesResult.rows[0].total_usdt) || 0,
        total_cost: parseFloat(purchasesResult.rows[0].total_cost) || 0
      },
      transfers: {
        count: parseInt(transfersResult.rows[0].count),
        total_usdt: parseFloat(transfersResult.rows[0].total_usdt) || 0
      },
      conversions: {
        count: parseInt(conversionsResult.rows[0].count),
        total_usdt: parseFloat(conversionsResult.rows[0].total_usdt) || 0,
        total_ves: parseInt(conversionsResult.rows[0].total_ves) || 0
      },
      profit: {
        gross: ((parseFloat(vesOrdersResult.rows[0].total_usdt) || 0) +
                (parseFloat(copOrdersResult.rows[0].total_usdt) || 0)) * 0.10
      }
    };

    res.json(report);
  } catch (error) {
    next(error);
  }
});

// Get orders by date range (PRIVATE - Brian only)
router.get('/orders', requireBrian(), async (req, res, next) => {
  try {
    const { start_date, end_date, type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date required' });
    }

    let params: any[] = [start_date, end_date];

    if (type === 'VES' || !type) {
      const vesResult = await pool.query(
        `SELECT 'VES' as order_type, id, customer_name, amount_ves as amount,
                exchange_rate, usdt_sold, date_submitted, date_completed, status
         FROM ves_orders
         WHERE DATE(date_completed) BETWEEN $1 AND $2
         AND status = 'COMPLETED'
         ORDER BY date_completed DESC`,
        params
      );

      if (type === 'VES') {
        return res.json(vesResult.rows);
      }

      if (!type) {
        const copResult = await pool.query(
          `SELECT 'COP' as order_type, id, customer_name, amount_cop as amount,
                  exchange_rate, usdt_sold, date_submitted, date_completed, status
           FROM cop_orders
           WHERE DATE(date_completed) BETWEEN $1 AND $2
           AND status = 'COMPLETED'
           ORDER BY date_completed DESC`,
          params
        );

        const combined = [...vesResult.rows, ...copResult.rows]
          .sort((a, b) => new Date(b.date_completed).getTime() - new Date(a.date_completed).getTime());

        return res.json(combined);
      }
    }

    if (type === 'COP') {
      const copResult = await pool.query(
        `SELECT 'COP' as order_type, id, customer_name, amount_cop as amount,
                exchange_rate, usdt_sold, date_submitted, date_completed, status
         FROM cop_orders
         WHERE DATE(date_completed) BETWEEN $1 AND $2
         AND status = 'COMPLETED'
         ORDER BY date_completed DESC`,
        params
      );

      return res.json(copResult.rows);
    }

    res.status(400).json({ error: 'Invalid type parameter' });
  } catch (error) {
    next(error);
  }
});

// Get Dairimar's daily report (PUBLIC - Dairimar only data, no profit)
router.get('/daily/dairimar', async (req, res, next) => {
  try {
    const { date } = req.query;

    // Use provided date or default to today
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Calculate Dairimar's starting balances (balance at start of target date)
    const startingBalancesResult = await pool.query(
      `SELECT
        -- Dairimar's USDT starting balance
        (SELECT COALESCE(SUM(amount_usdt), 0) FROM transfers WHERE DATE(date) < $1) -
        (SELECT COALESCE(SUM(usdt_amount), 0) FROM conversions WHERE DATE(date) < $1) as dai_usdt_start,

        -- Dairimar's VES starting balance
        (SELECT COALESCE(SUM(ves_received), 0) FROM conversions WHERE DATE(date) < $1) -
        (SELECT COALESCE(SUM(amount_ves), 0) FROM ves_orders WHERE status = 'COMPLETED' AND DATE(date_completed) < $1) as dai_ves_start`,
      [targetDate]
    );

    const startingBalances = startingBalancesResult.rows[0];

    // Get VES orders completed on the target date with all details
    const vesOrdersResult = await pool.query(
      `SELECT id, customer_name, amount_ves,
              COALESCE(exchange_rate, 0) as exchange_rate,
              COALESCE(usdt_sold, 0) as usdt_sold,
              date_submitted, date_completed, bank, phone_number, customer_id, account_number
       FROM ves_orders
       WHERE DATE(date_completed) = $1
       AND status = 'COMPLETED'
       ORDER BY date_completed DESC`,
      [targetDate]
    );

    // Get conversions made on the target date
    const conversionsResult = await pool.query(
      `SELECT id, usdt_amount, ves_received, exchange_rate, date,
              COALESCE(dai_usdt_after, 0) as dai_usdt_after,
              COALESCE(dai_ves_after, 0) as dai_ves_after
       FROM conversions
       WHERE DATE(date) = $1
       ORDER BY date DESC`,
      [targetDate]
    );

    // Calculate summary stats
    const totalVesSold = vesOrdersResult.rows.reduce((sum, o) => sum + parseInt(o.amount_ves || 0), 0);
    const totalUsdtSold = vesOrdersResult.rows.reduce((sum, o) => sum + parseFloat(o.usdt_sold || 0), 0);
    const totalUsdtConverted = conversionsResult.rows.reduce((sum, c) => sum + parseFloat(c.usdt_amount || 0), 0);
    const totalVesReceived = conversionsResult.rows.reduce((sum, c) => sum + parseInt(c.ves_received || 0), 0);

    const report = {
      date: targetDate,
      starting_balances: {
        dai_usdt: parseFloat(startingBalances.dai_usdt_start) || 0,
        dai_ves: parseInt(startingBalances.dai_ves_start, 10) || 0
      },
      ves_orders: {
        count: vesOrdersResult.rows.length,
        total_ves: totalVesSold,
        total_usdt: totalUsdtSold,
        orders: vesOrdersResult.rows.map(o => ({
          id: o.id,
          customer_name: o.customer_name,
          amount_ves: parseInt(o.amount_ves),
          exchange_rate: parseFloat(o.exchange_rate),
          usdt_sold: parseFloat(o.usdt_sold),
          date_submitted: o.date_submitted,
          date_completed: o.date_completed,
          bank: o.bank,
          phone_number: o.phone_number,
          customer_id: o.customer_id,
          account_number: o.account_number
        }))
      },
      conversions: {
        count: conversionsResult.rows.length,
        total_usdt: totalUsdtConverted,
        total_ves: totalVesReceived,
        items: conversionsResult.rows.map(c => ({
          id: c.id,
          usdt_amount: parseFloat(c.usdt_amount),
          ves_received: parseInt(c.ves_received),
          exchange_rate: parseFloat(c.exchange_rate),
          date: c.date,
          dai_usdt_after: parseFloat(c.dai_usdt_after),
          dai_ves_after: parseInt(c.dai_ves_after)
        }))
      }
    };

    res.json(report);
  } catch (error) {
    next(error);
  }
});

export { router as reportsRoutes };
