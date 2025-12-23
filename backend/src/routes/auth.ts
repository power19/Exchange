import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../database/connection';
import rateLimit from 'express-rate-limit';
import { jwtConfig, generateCSRFToken, csrfConfig } from '../config/security';

const router = Router();

// Rate limiting for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
});

// Login endpoint - sets HttpOnly cookie
router.post('/login', loginLimiter, async (req: Request, res: Response, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { username: user.username, role: user.role },
      jwtConfig.secret,
      { expiresIn: '24h' }
    );

    // Generate CSRF token for state-changing requests
    const csrfToken = generateCSRFToken();

    // Set HttpOnly cookie for JWT (not accessible via JavaScript)
    res.cookie(jwtConfig.cookieName, token, jwtConfig.cookieOptions);

    // Set CSRF token in a readable cookie (frontend needs to read this)
    res.cookie(csrfConfig.cookieName, csrfToken, {
      httpOnly: false, // Frontend needs to read this
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: jwtConfig.cookieOptions.maxAge,
      path: '/'
    });

    // Return user info (no token in response body for security)
    res.json({
      success: true,
      user: {
        username: user.username,
        role: user.role
      },
      csrfToken // Send CSRF token in response for SPA convenience
    });
  } catch (error) {
    next(error);
  }
});

// Logout endpoint - clears cookies
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie(jwtConfig.cookieName, { path: '/' });
  res.clearCookie(csrfConfig.cookieName, { path: '/' });
  res.json({ success: true, message: 'Logged out successfully' });
});

// Verify token endpoint - reads from cookie
router.get('/verify', async (req: Request, res: Response) => {
  try {
    // Try to get token from cookie first, then from header (backward compatibility)
    const cookieToken = req.cookies?.[jwtConfig.cookieName];
    const headerToken = req.headers.authorization?.split(' ')[1];
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({ valid: false, error: 'No authentication token' });
    }

    const decoded = jwt.verify(token, jwtConfig.secret) as { username: string; role: string };
    res.json({ valid: true, user: decoded });
  } catch (error) {
    res.clearCookie(jwtConfig.cookieName, { path: '/' });
    res.status(401).json({ valid: false, error: 'Invalid or expired token' });
  }
});

// Refresh CSRF token (for long-lived sessions)
router.post('/refresh-csrf', (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[jwtConfig.cookieName];

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify JWT is still valid
    jwt.verify(token, jwtConfig.secret);

    // Generate new CSRF token
    const csrfToken = generateCSRFToken();

    res.cookie(csrfConfig.cookieName, csrfToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: jwtConfig.cookieOptions.maxAge,
      path: '/'
    });

    res.json({ csrfToken });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired session' });
  }
});

export { router as authRoutes };
