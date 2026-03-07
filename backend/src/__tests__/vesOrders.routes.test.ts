/**
 * Integration tests for /api/ves-orders routes
 * Tests: RBAC, order creation, fulfillment, cancellation, balance validation
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

jest.mock('../middleware/idempotency', () => ({
  preventDuplicates: () => (_req: any, _res: any, next: any) => next()
}));

jest.mock('../services/pushNotificationService', () => ({
  PushNotificationService: {
    notifyNewVESOrder: jest.fn().mockResolvedValue(undefined),
    notifyVESOrderFulfilled: jest.fn().mockResolvedValue(undefined),
    notifyNewCOPOrder: jest.fn().mockResolvedValue(undefined),
    notifyCOPOrderFulfilled: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock('../utils/auditHelper', () => ({
  logCreate: jest.fn().mockResolvedValue(undefined),
  logFulfill: jest.fn().mockResolvedValue(undefined),
  logUpdate: jest.fn().mockResolvedValue(undefined),
  logCancel: jest.fn().mockResolvedValue(undefined)
}));

import pool from '../database/connection';
import { vesOrderRoutes } from '../routes/vesOrders';

const mockPool = pool as any;

function buildApp(userRole: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req: any, _res: any, next: any) => {
    req.userRole = userRole;
    next();
  });
  app.use('/api/ves-orders', vesOrderRoutes);
  // Error handler
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });
  return app;
}

const mockVESOrder = {
  id: 1,
  date_submitted: new Date().toISOString(),
  customer_name: 'Maria Rodriguez',
  amount_ves: 5000000,
  bank: 'Banco de Venezuela',
  phone_number: '+58 412-555-1234',
  customer_id: 'V-12345678',
  account_number: '01340123456789012345',
  status: 'PENDING',
  exchange_rate: null,
  usdt_sold: null,
  date_completed: null
};

// Helper to create a transaction mock client
function makeTransactionClient(responses: any[]) {
  let callCount = 0;
  return {
    query: jest.fn(() => {
      const response = responses[callCount] || undefined;
      callCount++;
      return Promise.resolve(response);
    }),
    release: jest.fn()
  };
}

describe('GET /api/ves-orders - RBAC', () => {
  it('allows brian to list VES orders', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockVESOrder] });

    const res = await request(buildApp('brian'))
      .get('/api/ves-orders');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('allows dairimar to list VES orders', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [] });

    const res = await request(buildApp('dairimar'))
      .get('/api/ves-orders');

    expect(res.status).toBe(200);
  });

  it('blocks patty from listing VES orders', async () => {
    const res = await request(buildApp('patty'))
      .get('/api/ves-orders');

    expect(res.status).toBe(403);
  });

  it('filters by status when query param provided', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockVESOrder] });

    const res = await request(buildApp('brian'))
      .get('/api/ves-orders?status=PENDING');

    expect(res.status).toBe(200);
    // Verify the query was called with status filter
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status'),
      expect.arrayContaining(['PENDING'])
    );
  });
});

describe('POST /api/ves-orders - RBAC', () => {
  it('allows patty to create a VES order', async () => {
    const mockClient = makeTransactionClient([
      undefined,                          // BEGIN
      { rows: [mockVESOrder] },           // INSERT
      undefined                           // COMMIT
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .post('/api/ves-orders')
      .send({
        customer_name: 'Maria Rodriguez',
        amount_ves: 5000000
      });

    expect(res.status).toBe(201);
  });

  it('allows brian to create a VES order', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockVESOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('brian'))
      .post('/api/ves-orders')
      .send({
        customer_name: 'Maria Rodriguez',
        amount_ves: 5000000
      });

    expect(res.status).toBe(201);
  });

  it('blocks dairimar from creating VES orders', async () => {
    const res = await request(buildApp('dairimar'))
      .post('/api/ves-orders')
      .send({
        customer_name: 'Maria Rodriguez',
        amount_ves: 5000000
      });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ves-orders - Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('patty');
    jest.clearAllMocks();
  });

  it('returns 400 when customer_name is missing', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders')
      .send({ amount_ves: 5000000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 when amount_ves is zero', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders')
      .send({ customer_name: 'Maria Rodriguez', amount_ves: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least/i);
  });

  it('returns 400 when amount_ves has decimals', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders')
      .send({ customer_name: 'Maria Rodriguez', amount_ves: 5000000.5 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/whole number/i);
  });

  it('returns 400 for invalid phone number', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders')
      .send({
        customer_name: 'Maria Rodriguez',
        amount_ves: 5000000,
        phone_number: 'CALL-ME-NOW'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid characters/i);
  });

  it('returns 400 for invalid account number with special chars', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders')
      .send({
        customer_name: 'Maria Rodriguez',
        amount_ves: 5000000,
        account_number: '0134@bank#hack'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid characters/i);
  });
});

describe('POST /api/ves-orders/:id/fulfill - RBAC', () => {
  it('allows dairimar to fulfill orders', async () => {
    const mockClient = makeTransactionClient([
      undefined,                                   // BEGIN
      { rows: [mockVESOrder] },                   // SELECT order
      { rows: [{ total: '20000000' }] },          // VES balance (conversions)
      { rows: [{ total: '5000000' }] },           // VES balance (sold)
      { rows: [{ ...mockVESOrder, status: 'COMPLETED', exchange_rate: 40000, usdt_sold: 125 }] }, // UPDATE
      undefined                                    // COMMIT
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('dairimar'))
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(200);
  });

  it('allows brian to fulfill orders', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockVESOrder] },
      { rows: [{ total: '20000000' }] },
      { rows: [{ total: '0' }] },
      { rows: [{ ...mockVESOrder, status: 'COMPLETED' }] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('brian'))
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(200);
  });

  it('blocks patty from fulfilling orders', async () => {
    const res = await request(buildApp('patty'))
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/ves-orders/:id/fulfill - Business Logic', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('dairimar');
    jest.clearAllMocks();
  });

  it('returns 404 when order does not exist', async () => {
    const mockClient = makeTransactionClient([
      undefined,          // BEGIN
      { rows: [] },       // SELECT - order not found
      undefined           // ROLLBACK
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/999/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when order is already completed', async () => {
    const completedOrder = { ...mockVESOrder, status: 'COMPLETED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [completedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already completed/i);
  });

  it('returns 400 when order is cancelled', async () => {
    const cancelledOrder = { ...mockVESOrder, status: 'CANCELLED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [cancelledOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cancelled/i);
  });

  it('returns 400 when exchange_rate is zero', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockVESOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    // Use -1: truthy so it bypasses the "no rate" lookup, but fails min=0.01 validation
    const res = await request(app)
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least/i);
  });

  it('returns 400 when Dai VES balance is insufficient', async () => {
    const orderWith10MVES = { ...mockVESOrder, amount_ves: 10000000 };
    const mockClient = makeTransactionClient([
      undefined,                            // BEGIN
      { rows: [orderWith10MVES] },          // SELECT order
      { rows: [{ total: '5000000' }] },    // getDaiVESBalance: conversions
      { rows: [{ total: '3000000' }] },    // getDaiVESBalance: sold (balance = 2M, need 10M)
      undefined                             // ROLLBACK
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient ves balance/i);
    expect(res.body).toHaveProperty('current_balance');
    expect(res.body).toHaveProperty('required');
  });

  it('calculates usdt_sold = amount_ves / exchange_rate', async () => {
    // order: 4,000,000 VES at rate 40,000 = 100 USDT sold
    const orderWith4MVES = { ...mockVESOrder, amount_ves: 4000000 };
    let capturedUpdateParams: any[] = [];

    const mockClient = {
      query: jest.fn((sql: string, params?: any[]) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve(undefined);
        if (sql.includes('SELECT * FROM ves_orders')) return Promise.resolve({ rows: [orderWith4MVES] });
        if (sql.includes('FROM conversions')) return Promise.resolve({ rows: [{ total: '20000000' }] });
        if (sql.includes('FROM ves_orders')) return Promise.resolve({ rows: [{ total: '0' }] });
        if (sql.includes('UPDATE')) {
          capturedUpdateParams = params || [];
          return Promise.resolve({ rows: [{ ...orderWith4MVES, status: 'COMPLETED', exchange_rate: 40000, usdt_sold: 100 }] });
        }
        return Promise.resolve(undefined);
      }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/1/fulfill')
      .send({ exchange_rate: 40000 });

    expect(res.status).toBe(200);
    // capturedUpdateParams: [exchange_rate, usdt_sold, date_completed, id]
    const usdtSold = capturedUpdateParams[1];
    expect(usdtSold).toBeCloseTo(100); // 4,000,000 / 40,000 = 100
  });
});

describe('POST /api/ves-orders/:id/cancel', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('patty');
    jest.clearAllMocks();
  });

  it('cancels a pending order', async () => {
    const cancelledOrder = { ...mockVESOrder, status: 'CANCELLED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockVESOrder] },
      { rows: [cancelledOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/1/cancel');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('returns 400 when trying to cancel a completed order', async () => {
    const completedOrder = { ...mockVESOrder, status: 'COMPLETED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [completedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/1/cancel');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/can only cancel pending/i);
  });

  it('returns 404 for non-existent order', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/ves-orders/999/cancel');

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

describe('PUT /api/ves-orders/:id - Update pending order', () => {
  it('allows patty to update a pending order', async () => {
    const updatedOrder = { ...mockVESOrder, customer_name: 'Updated Name' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockVESOrder] },
      { rows: [updatedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .put('/api/ves-orders/1')
      .send({ customer_name: 'Updated Name' });

    expect(res.status).toBe(200);
  });

  it('returns 400 when trying to update completed order', async () => {
    const completedOrder = { ...mockVESOrder, status: 'COMPLETED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [completedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .put('/api/ves-orders/1')
      .send({ customer_name: 'Updated Name' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/can only edit pending/i);
  });

  it('returns 400 when no fields provided to update', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockVESOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .put('/api/ves-orders/1')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no fields to update/i);
  });

  it('blocks dairimar from updating orders', async () => {
    const res = await request(buildApp('dairimar'))
      .put('/api/ves-orders/1')
      .send({ customer_name: 'Updated Name' });

    expect(res.status).toBe(403);
  });
});
