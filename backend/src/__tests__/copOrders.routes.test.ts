/**
 * Integration tests for /api/cop-orders routes
 * Tests: RBAC, order creation, fulfillment, cancellation, balance validation
 * COP orders are private to Brian (only Brian can view), Patty can submit
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
import { copOrderRoutes } from '../routes/copOrders';

const mockPool = pool as any;

function buildApp(userRole: string) {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req: any, _res: any, next: any) => {
    req.userRole = userRole;
    next();
  });
  app.use('/api/cop-orders', copOrderRoutes);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  });
  return app;
}

const mockCOPOrder = {
  id: 1,
  date_submitted: new Date().toISOString(),
  customer_name: 'Carlos Lopez',
  amount_cop: 2000000,
  bank: 'Bancolombia',
  phone_number: '+57 300-555-1234',
  customer_id: 'CC-12345678',
  account_number: 'COL 123456',
  status: 'PENDING',
  exchange_rate: null,
  usdt_sold: null,
  date_completed: null
};

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

describe('GET /api/cop-orders - RBAC', () => {
  it('allows brian to list COP orders', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockCOPOrder] });

    const res = await request(buildApp('brian'))
      .get('/api/cop-orders');

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('blocks dairimar from listing COP orders', async () => {
    const res = await request(buildApp('dairimar'))
      .get('/api/cop-orders');

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access denied/i);
  });

  it('blocks patty from listing COP orders', async () => {
    const res = await request(buildApp('patty'))
      .get('/api/cop-orders');

    expect(res.status).toBe(403);
  });

  it('filters by status when query param provided', async () => {
    (mockPool.query as jest.Mock).mockResolvedValue({ rows: [mockCOPOrder] });

    const res = await request(buildApp('brian'))
      .get('/api/cop-orders?status=PENDING');

    expect(res.status).toBe(200);
    expect(mockPool.query).toHaveBeenCalledWith(
      expect.stringContaining('WHERE status'),
      expect.arrayContaining(['PENDING'])
    );
  });
});

describe('POST /api/cop-orders - RBAC', () => {
  it('allows patty to create a COP order', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockCOPOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .post('/api/cop-orders')
      .send({
        customer_name: 'Carlos Lopez',
        amount_cop: 2000000
      });

    expect(res.status).toBe(201);
  });

  it('allows brian to create a COP order', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockCOPOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('brian'))
      .post('/api/cop-orders')
      .send({
        customer_name: 'Carlos Lopez',
        amount_cop: 2000000
      });

    expect(res.status).toBe(201);
  });

  it('blocks dairimar from creating COP orders', async () => {
    const res = await request(buildApp('dairimar'))
      .post('/api/cop-orders')
      .send({
        customer_name: 'Carlos Lopez',
        amount_cop: 2000000
      });

    expect(res.status).toBe(403);
  });
});

describe('POST /api/cop-orders - Validation', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('patty');
    jest.clearAllMocks();
  });

  it('returns 400 for missing customer_name', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders')
      .send({ amount_cop: 2000000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('returns 400 for zero amount_cop', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders')
      .send({ customer_name: 'Carlos Lopez', amount_cop: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least/i);
  });

  it('returns 400 when amount_cop has decimals', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders')
      .send({ customer_name: 'Carlos Lopez', amount_cop: 2000000.50 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/whole number/i);
  });

  it('returns 400 for invalid phone number', async () => {
    const mockClient = makeTransactionClient([undefined]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders')
      .send({
        customer_name: 'Carlos Lopez',
        amount_cop: 2000000,
        phone_number: 'CALLME'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid characters/i);
  });
});

describe('POST /api/cop-orders/:id/fulfill - RBAC', () => {
  it('allows only brian to fulfill COP orders', async () => {
    // dairimar should be blocked
    const resD = await request(buildApp('dairimar'))
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });
    expect(resD.status).toBe(403);

    // patty should be blocked
    const resP = await request(buildApp('patty'))
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });
    expect(resP.status).toBe(403);
  });

  it('allows brian to fulfill a COP order', async () => {
    const fulfilledOrder = {
      ...mockCOPOrder,
      status: 'COMPLETED',
      exchange_rate: 4000,
      usdt_sold: 500
    };

    const mockClient = {
      query: jest.fn((sql: string) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve(undefined);
        if (sql.includes('SELECT * FROM cop_orders')) return Promise.resolve({ rows: [mockCOPOrder] });
        // getBrianBalance: 3 queries
        if (sql.includes('FROM purchases')) return Promise.resolve({ rows: [{ total: '2000' }] });
        if (sql.includes('FROM transfers')) return Promise.resolve({ rows: [{ total: '0' }] });
        if (sql.includes('FROM cop_orders') && sql.includes('COMPLETED')) return Promise.resolve({ rows: [{ total: '0' }] });
        if (sql.includes('UPDATE')) return Promise.resolve({ rows: [fulfilledOrder] });
        return Promise.resolve(undefined);
      }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('brian'))
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
  });
});

describe('POST /api/cop-orders/:id/fulfill - Business Logic', () => {
  let app: express.Application;

  beforeEach(() => {
    app = buildApp('brian');
    jest.clearAllMocks();
  });

  it('returns 404 when order does not exist', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders/999/fulfill')
      .send({ exchange_rate: 4000 });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 400 when order is already completed', async () => {
    const completedOrder = { ...mockCOPOrder, status: 'COMPLETED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [completedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already completed/i);
  });

  it('returns 400 when order is cancelled', async () => {
    const cancelledOrder = { ...mockCOPOrder, status: 'CANCELLED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [cancelledOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cancelled/i);
  });

  it('returns 400 when Brian USDT balance is insufficient', async () => {
    // COP order: 2,000,000 COP at 4000 rate = 500 USDT needed
    // Brian balance: 100 USDT (insufficient)
    const mockClient = {
      query: jest.fn((sql: string) => {
        if (sql.includes('BEGIN') || sql.includes('ROLLBACK')) return Promise.resolve(undefined);
        if (sql.includes('SELECT * FROM cop_orders')) return Promise.resolve({ rows: [mockCOPOrder] }); // amount_cop: 2M
        if (sql.includes('FROM purchases')) return Promise.resolve({ rows: [{ total: '100' }] }); // Brian has 100 USDT
        if (sql.includes('FROM transfers')) return Promise.resolve({ rows: [{ total: '0' }] });
        if (sql.includes('FROM cop_orders') && sql.includes('COMPLETED')) return Promise.resolve({ rows: [{ total: '0' }] });
        return Promise.resolve(undefined);
      }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient usdt balance/i);
    expect(res.body).toHaveProperty('current_balance');
    expect(res.body).toHaveProperty('required');
  });

  it('calculates usdt_sold = amount_cop / exchange_rate', async () => {
    // 2,000,000 COP / 4000 rate = 500 USDT
    let capturedUpdateParams: any[] = [];

    const mockClient = {
      query: jest.fn((sql: string, params?: any[]) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT')) return Promise.resolve(undefined);
        if (sql.includes('SELECT * FROM cop_orders')) return Promise.resolve({ rows: [mockCOPOrder] });
        if (sql.includes('FROM purchases')) return Promise.resolve({ rows: [{ total: '10000' }] }); // Brian: 10000 USDT
        if (sql.includes('FROM transfers')) return Promise.resolve({ rows: [{ total: '0' }] });
        if (sql.includes('FROM cop_orders') && sql.includes('COMPLETED')) return Promise.resolve({ rows: [{ total: '0' }] });
        if (sql.includes('UPDATE')) {
          capturedUpdateParams = params || [];
          return Promise.resolve({ rows: [{ ...mockCOPOrder, status: 'COMPLETED', usdt_sold: 500 }] });
        }
        return Promise.resolve(undefined);
      }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(app)
      .post('/api/cop-orders/1/fulfill')
      .send({ exchange_rate: 4000 });

    expect(res.status).toBe(200);
    // capturedUpdateParams: [exchange_rate, usdt_sold, date_completed, id]
    const usdtSold = capturedUpdateParams[1];
    expect(usdtSold).toBeCloseTo(500); // 2,000,000 / 4000 = 500
  });
});

describe('POST /api/cop-orders/:id/cancel', () => {
  it('allows patty to cancel pending orders', async () => {
    const cancelledOrder = { ...mockCOPOrder, status: 'CANCELLED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockCOPOrder] },
      { rows: [cancelledOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .post('/api/cop-orders/1/cancel');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('CANCELLED');
  });

  it('allows brian to cancel pending orders', async () => {
    const cancelledOrder = { ...mockCOPOrder, status: 'CANCELLED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockCOPOrder] },
      { rows: [cancelledOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('brian'))
      .post('/api/cop-orders/1/cancel');

    expect(res.status).toBe(200);
  });

  it('returns 400 when trying to cancel a completed order', async () => {
    const completedOrder = { ...mockCOPOrder, status: 'COMPLETED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [completedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .post('/api/cop-orders/1/cancel');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/can only cancel pending/i);
  });

  it('blocks dairimar from cancelling orders', async () => {
    const res = await request(buildApp('dairimar'))
      .post('/api/cop-orders/1/cancel');

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/cop-orders/:id - Update', () => {
  it('allows patty to update a pending order', async () => {
    const updatedOrder = { ...mockCOPOrder, customer_name: 'Updated Carlos' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockCOPOrder] },
      { rows: [updatedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .put('/api/cop-orders/1')
      .send({ customer_name: 'Updated Carlos' });

    expect(res.status).toBe(200);
    expect(res.body.customer_name).toBe('Updated Carlos');
  });

  it('returns 400 when no fields provided', async () => {
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [mockCOPOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .put('/api/cop-orders/1')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/no fields to update/i);
  });

  it('returns 400 when updating a completed order', async () => {
    const completedOrder = { ...mockCOPOrder, status: 'COMPLETED' };
    const mockClient = makeTransactionClient([
      undefined,
      { rows: [completedOrder] },
      undefined
    ]);
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const res = await request(buildApp('patty'))
      .put('/api/cop-orders/1')
      .send({ customer_name: 'Updated Carlos' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/can only edit pending/i);
  });

  it('blocks dairimar from updating orders', async () => {
    const res = await request(buildApp('dairimar'))
      .put('/api/cop-orders/1')
      .send({ customer_name: 'Updated' });

    expect(res.status).toBe(403);
  });
});
