import { Router } from 'express';
import pool from '../database/connection';

const router = Router();

// Get daily report
router.get('/daily', async (req, res, next) => {
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

    const report = {
      date: targetDate,
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

// Get orders by date range
router.get('/orders', async (req, res, next) => {
  try {
    const { start_date, end_date, type } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date required' });
    }

    let query = '';
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

export { router as reportsRoutes };
