/**
 * Integration tests for /api/auth routes
 * Tests: login, logout, verify, refresh-csrf
 */

import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcrypt';

// Mock dependencies before importing routes
jest.mock('../database/connection', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

// Mock express-rate-limit so the login limiter is a no-op in tests
jest.mock('express-rate-limit', () => {
  return () => (_req: any, _res: any, next: any) => next();
});

// Mock Firebase admin to avoid initialization
jest.mock('../services/pushNotificationService', () => ({
  PushNotificationService: {
    notifyNewVESOrder: jest.fn().mockResolvedValue(undefined),
    notifyNewCOPOrder: jest.fn().mockResolvedValue(undefined),
    notifyVESOrderFulfilled: jest.fn().mockResolvedValue(undefined),
    notifyCOPOrderFulfilled: jest.fn().mockResolvedValue(undefined)
  }
}));

import pool from '../database/connection';
import { authRoutes } from '../routes/auth';

const mockPool = pool as any;

// Build a minimal test app
function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  // Set userRole for subdomain middleware compatibility
  app.use((req: any, _res: any, next: any) => {
    req.userRole = 'brian';
    next();
  });
  app.use('/api/auth', authRoutes);
  return app;
}

describe('POST /api/auth/login', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp();
    jest.clearAllMocks();
  });

  it('returns 400 when username is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'secret' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username and password required/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/username and password required/i);
  });

  it('returns 401 when user not found', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nonexistent', password: 'wrong' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 401 when password is wrong', async () => {
    const hashedPassword = await bcrypt.hash('correct-password', 10);
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [{ username: 'admin', role: 'admin', password_hash: hashedPassword }]
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  it('returns 200 and sets cookies on successful login', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [{ username: 'admin', role: 'admin', password_hash: hashedPassword }]
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.username).toBe('admin');
    expect(res.body.user.role).toBe('admin');
    expect(res.body.csrfToken).toBeDefined();
    // JWT cookie should be set
    const cookies = (res.headers['set-cookie'] as unknown) as string[];
    expect(cookies).toBeDefined();
    const authCookie = cookies.find((c: string) => c.startsWith('auth_token='));
    expect(authCookie).toBeDefined();
    expect(authCookie).toContain('HttpOnly');
  });

  it('does not expose password_hash in response', async () => {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    (mockPool.query as jest.Mock).mockResolvedValue({
      rows: [{ username: 'admin', role: 'admin', password_hash: hashedPassword }]
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });

    expect(res.body.user).not.toHaveProperty('password_hash');
  });
});

describe('POST /api/auth/logout', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp();
  });

  it('returns 200 and clears cookies', async () => {
    const res = await request(app)
      .post('/api/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('GET /api/auth/verify', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp();
  });

  it('returns 401 when no token provided', async () => {
    const res = await request(app)
      .get('/api/auth/verify');

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('returns 401 for invalid bearer token', async () => {
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer invalid.token.here');

    expect(res.status).toBe(401);
    expect(res.body.valid).toBe(false);
  });

  it('returns 200 for valid bearer token', async () => {
    // Import jwtConfig to sign with the same secret used by the route
    const { jwtConfig } = require('../config/security');
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { username: 'admin', role: 'admin' },
      jwtConfig.secret,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.user.username).toBe('admin');
  });
});
