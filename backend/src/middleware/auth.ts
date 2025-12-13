import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { username: string; role: string };

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
