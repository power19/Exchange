import { Router, Request, Response } from 'express';
import pool from '../database/connection';

const router = Router();

/**
 * Register a device token for push notifications
 * POST /api/device-tokens/register
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { user_role, device_token, device_id, platform } = req.body;

    if (!user_role || !device_token) {
      return res.status(400).json({ error: 'user_role and device_token are required' });
    }

    if (!['brian', 'dairimar', 'patty'].includes(user_role)) {
      return res.status(400).json({ error: 'Invalid user_role' });
    }

    // Upsert: insert or update if exists
    const result = await pool.query(`
      INSERT INTO device_tokens (user_role, device_token, device_id, platform, last_used_at, is_active)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, true)
      ON CONFLICT (device_token)
      DO UPDATE SET
        user_role = EXCLUDED.user_role,
        device_id = EXCLUDED.device_id,
        platform = EXCLUDED.platform,
        last_used_at = CURRENT_TIMESTAMP,
        is_active = true
      RETURNING *
    `, [user_role, device_token, device_id || null, platform || null]);

    console.log(`✅ Device token registered for ${user_role}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({ error: 'Failed to register device token' });
  }
});

/**
 * Unregister a device token
 * POST /api/device-tokens/unregister
 */
router.post('/unregister', async (req: Request, res: Response) => {
  try {
    const { device_token } = req.body;

    if (!device_token) {
      return res.status(400).json({ error: 'device_token is required' });
    }

    await pool.query(
      'UPDATE device_tokens SET is_active = false WHERE device_token = $1',
      [device_token]
    );

    console.log(`🗑️  Device token unregistered`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error unregistering device token:', error);
    res.status(500).json({ error: 'Failed to unregister device token' });
  }
});

export default router;
