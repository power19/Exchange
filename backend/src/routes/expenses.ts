import { Router, Request, Response } from 'express';
import pool from '../database/connection';
import { Expense } from '../types';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Get all expenses (protected - requires authentication)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT * FROM expenses ORDER BY date DESC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Create new expense (protected - requires authentication)
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { date, amount_usd, description } = req.body;

    if (!amount_usd || amount_usd <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = await pool.query<Expense>(
      `INSERT INTO expenses (date, amount_usd, description)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [date || new Date(), amount_usd, description.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense (protected - requires authentication)
router.put('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { date, amount_usd, description } = req.body;

    if (!amount_usd || amount_usd <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    if (!description || description.trim() === '') {
      return res.status(400).json({ error: 'Description is required' });
    }

    const result = await pool.query<Expense>(
      `UPDATE expenses
       SET date = $1, amount_usd = $2, description = $3
       WHERE id = $4
       RETURNING *`,
      [date || new Date(), amount_usd, description.trim(), id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense (protected - requires authentication)
router.delete('/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM expenses WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully', expense: result.rows[0] });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

export { router as expensesRoutes };
