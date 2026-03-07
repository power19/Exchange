/**
 * Integration tests for /api/purchases routes
 * Tests RBAC, validation, and business logic for USDT purchase transactions
 */

import express from 'express';
import request from 'supertest';
import cookieParser from 'cookie-parser';

jest.mock('../database/connection', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

jest.mock('../middleware/rateLimiter', () => ({
  writeLimiter: (_req: any, _res: any, next: any) => next(),
  orderLimiter: (_req: any, _res: any, next: any) => next(),
  criticalLimiter: (_req: any, _res: any, next: any) => next(),
  globalLimiter: (_req: any, _res: any, next: any) => next()
}));

jest.mock('../utils/auditHelper', () => ({
  logCreate: jest.fn().mockResolvedValue(undefined),
  logFulfill: jest.fn().mockResolvedValue(undefined),
  logUpdate: jest.fn().mockResolvedValue(undefined),
  logCancel: jest.fn().mockResolvedValue(undefined)
}));

import pool from '../database/connection';
import { purchaseRoutes } from '../routes/purchases';

const mockPool = pool as any;

function buildApp(userRole: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req: any, _res: any, next: any) => {
    req.userRole = userRole;
    next();
  });
  app.use('/api/purchases', purchaseRoutes);
  return app;
}

function makeMockClient(insertResult?: any) {
  return {
    query: jest.fn()
      .mockResolvedValueOnce(undefined)  // BEGIN
      .mockResolvedValueOnce(insertResult || { rows: [mockPurchase] }) // INSERT
      .mockResolvedValueOnce(undefined), // COMMIT
    release: jest.fn()
  };
}

const mockPurchase = {
  id: 1,
  date: new Date().toISOString(),
  amount_usdt: 1000,
  fee_percentage: 0.04,
  total_cost_usd: 1040,
  status: 'completed'
};

describe('GET /api/purchases - RBAC', () => {
  it('allows brian to list purchases', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockPurchase] });

    const res = await request(buildApp('brian'))
      .get('/api/purchases');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('allows dairimar to list purchases', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

    const res = await request(buildApp('dairimar'))
      .get('/api/purchases');

    expect(res.status).toBe(200);
  });

  it('blocks patty from viewing purchases', async () => {
    const res = await request(buildApp('patty'))
      .get('/api/purchases');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });
});

describe('POST /api/purchases - RBAC', () => {
  it('blocks dairimar from creating purchases', async () => {
    const res = await request(buildApp('dairimar'))
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 0.04 });

    expect(res.status).toBe(403);
  });

  it('blocks patty from creating purchases', async () => {
    const res = await request(buildApp('patty'))
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 0.04 });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/purchases - Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('brian');
    jest.clearAllMocks();
  });

  it('returns 400 for missing amount_usdt', async () => {
    const mockClient = makeMockClient();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ fee_percentage: 0.04 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid number/i);
  });

  it('returns 400 for zero amount', async () => {
    const mockClient = makeMockClient();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 0, fee_percentage: 0.04 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least/i);
  });

  it('returns 400 for negative amount', async () => {
    const mockClient = makeMockClient();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: -100, fee_percentage: 0.04 });

    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid fee_percentage', async () => {
    const mockClient = makeMockClient();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 'bad' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid number/i);
  });

  it('returns 400 when fee_percentage exceeds 1 (100%)', async () => {
    const mockClient = makeMockClient();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 1.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot exceed/i);
  });

  it('returns 400 for non-numeric amount', async () => {
    const mockClient = makeMockClient();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 'one thousand', fee_percentage: 0.04 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/purchases - Business Logic', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('brian');
    jest.clearAllMocks();
  });

  it('creates a purchase and returns 201', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPurchase] }) // INSERT
        .mockResolvedValueOnce(undefined), // COMMIT
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 0.04 });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.amount_usdt).toBe(1000);
  });

  it('calculates total_cost_usd = amount * (1 + fee)', async () => {
    // Capture the actual INSERT parameters
    let insertParams: any[] = [];
    const mockClient = {
      query: jest.fn((sql: string, params?: any[]) => {
        if (sql.includes('INSERT')) {
          insertParams = params || [];
          return Promise.resolve({ rows: [mockPurchase] });
        }
        return Promise.resolve(undefined);
      }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 0.04 });

    // insertParams: [date, amount_usdt, fee_percentage, total_cost_usd]
    const total_cost = insertParams[3];
    expect(total_cost).toBeCloseTo(1040); // 1000 * (1 + 0.04)
  });

  it('accepts zero fee percentage', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ rows: [{ ...mockPurchase, fee_percentage: 0, total_cost_usd: 1000 }] })
        .mockResolvedValueOnce(undefined),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 0 });

    expect(res.status).toBe(201);
  });

  it('rolls back transaction on database error', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('DB error')), // INSERT fails
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/purchases')
      .send({ amount_usdt: 1000, fee_percentage: 0.04 });

    expect(res.status).toBe(500);
    expect(mockClient.release).toHaveBeenCalled();
  });
});
