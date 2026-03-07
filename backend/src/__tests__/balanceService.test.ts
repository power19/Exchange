/**
 * Unit tests for BalanceService
 * All database calls are mocked to test calculation logic in isolation
 */

import { BalanceService } from '../services/balanceService';

// Mock the database connection pool
jest.mock('../database/connection', () => ({
  __esModule: true,
  default: {
    connect: jest.fn(),
    query: jest.fn(),
    end: jest.fn()
  }
}));

import pool from '../database/connection';
const mockPool = pool as any;

/** Helper to create a mock DB client */
function makeMockClient(queryResults: Record<string, any>) {
  return {
    query: jest.fn((sql: string, _params?: any[]) => {
      // Match queries by keywords
      for (const [key, value] of Object.entries(queryResults)) {
        if (sql.includes(key)) {
          return Promise.resolve({ rows: [{ total: value }] });
        }
      }
      return Promise.resolve({ rows: [{ total: '0' }] });
    }),
    release: jest.fn()
  };
}

describe('BalanceService.getBrianBalance', () => {
  it('calculates Brian balance correctly: purchases - transfers - cop_sold', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '1000.00' }] })  // purchases
        .mockResolvedValueOnce({ rows: [{ total: '200.00' }] })   // transfers
        .mockResolvedValueOnce({ rows: [{ total: '50.00' }] }),   // cop sold
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getBrianBalance();

    expect(balance).toBe(750); // 1000 - 200 - 50
    expect(mockClient.release).toHaveBeenCalled();
  });

  it('returns zero when no transactions exist', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getBrianBalance();
    expect(balance).toBe(0);
  });

  it('uses provided client (transaction-safe)', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '500.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '100.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };

    const balance = await BalanceService.getBrianBalance(mockClient);

    expect(balance).toBe(400); // 500 - 100 - 0
    // Should NOT release the provided client
    expect(mockClient.release).not.toHaveBeenCalled();
    // Should NOT call pool.connect when client is provided
    expect(mockPool.connect).not.toHaveBeenCalled();
  });

  it('handles decimal amounts correctly', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '1500.75' }] })
        .mockResolvedValueOnce({ rows: [{ total: '300.25' }] })
        .mockResolvedValueOnce({ rows: [{ total: '100.50' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getBrianBalance();
    expect(balance).toBeCloseTo(1100); // 1500.75 - 300.25 - 100.50
  });
});

describe('BalanceService.getDaiUSDTBalance', () => {
  it('calculates Dai USDT balance: transfers - conversions', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '500.00' }] })  // transfers received
        .mockResolvedValueOnce({ rows: [{ total: '200.00' }] }), // conversions
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getDaiUSDTBalance();
    expect(balance).toBe(300); // 500 - 200
  });

  it('returns zero with empty database', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getDaiUSDTBalance();
    expect(balance).toBe(0);
  });

  it('uses provided client without releasing it', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '300.00' }] })
        .mockResolvedValueOnce({ rows: [{ total: '150.00' }] }),
      release: jest.fn()
    };

    const balance = await BalanceService.getDaiUSDTBalance(mockClient);
    expect(balance).toBe(150);
    expect(mockClient.release).not.toHaveBeenCalled();
  });
});

describe('BalanceService.getDaiVESBalance', () => {
  it('calculates VES balance: conversions - ves_sold', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '20000000' }] }) // VES converted
        .mockResolvedValueOnce({ rows: [{ total: '5000000' }] }), // VES sold
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getDaiVESBalance();
    expect(balance).toBe(15000000); // 20M - 5M
  });

  it('handles string numeric returns from PostgreSQL BIGINT', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '40000000' }] }) // as string (BIGINT)
        .mockResolvedValueOnce({ rows: [{ total: '10000000' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getDaiVESBalance();
    expect(balance).toBe(30000000);
    expect(typeof balance).toBe('number');
  });

  it('handles numeric returns from PostgreSQL', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 25000000 }] }) // as number
        .mockResolvedValueOnce({ rows: [{ total: 5000000 }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const balance = await BalanceService.getDaiVESBalance();
    expect(balance).toBe(20000000);
  });

  it('throws error on NaN values', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: 'invalid' }] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    await expect(BalanceService.getDaiVESBalance()).rejects.toThrow('Invalid VES balance calculation');
  });
});

describe('BalanceService.getAllBalances', () => {
  it('returns all three balances together', async () => {
    // Each getBrianBalance / getDaiUSDTBalance / getDaiVESBalance needs its own mock client
    const makeClient = (vals: string[]) => ({
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: vals[0] }] })
        .mockResolvedValueOnce({ rows: [{ total: vals[1] }] })
        .mockResolvedValueOnce({ rows: [{ total: vals[2] || '0' }] }),
      release: jest.fn()
    });

    (mockPool.connect as jest.Mock)
      .mockResolvedValueOnce(makeClient(['1000', '200', '50']))   // Brian
      .mockResolvedValueOnce(makeClient(['200', '100']))           // Dai USDT
      .mockResolvedValueOnce(makeClient(['20000000', '5000000'])); // Dai VES

    const balances = await BalanceService.getAllBalances();

    expect(balances).toHaveProperty('brian_usdt');
    expect(balances).toHaveProperty('dai_usdt');
    expect(balances).toHaveProperty('dai_ves');
    expect(typeof balances.brian_usdt).toBe('number');
    expect(typeof balances.dai_usdt).toBe('number');
    expect(typeof balances.dai_ves).toBe('number');
  });
});

describe('BalanceService.getTotalUSDTSold', () => {
  it('sums VES and COP order USDT sold', async () => {
    const mockClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '500.00' }] })  // VES orders
        .mockResolvedValueOnce({ rows: [{ total: '300.00' }] }), // COP orders
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const total = await BalanceService.getTotalUSDTSold();
    expect(total).toBe(800);
  });

  it('returns zero when no completed orders', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const total = await BalanceService.getTotalUSDTSold();
    expect(total).toBe(0);
  });
});

describe('BalanceService.getProfitData', () => {
  it('calculates profit as 10% of total USDT sold', async () => {
    // getProfitData acquires its client FIRST (1st pool.connect call)
    // then calls getTotalUSDTSold which acquires its OWN client (2nd pool.connect call)
    const withdrawalClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '20.00' }] }), // withdrawals query
      release: jest.fn()
    };
    const usdtClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '1000.00' }] }) // VES sold
        .mockResolvedValueOnce({ rows: [{ total: '0' }] }),      // COP sold
      release: jest.fn()
    };

    (mockPool.connect as jest.Mock)
      .mockResolvedValueOnce(withdrawalClient) // 1st call → getProfitData's client
      .mockResolvedValueOnce(usdtClient);      // 2nd call → getTotalUSDTSold's client

    const profit = await BalanceService.getProfitData();

    expect(profit.total_usdt_sold).toBe(1000);
    expect(profit.total_profit).toBe(100);        // 10% of 1000
    expect(profit.withdrawn_profit).toBe(20);
    expect(profit.available_profit).toBe(80);      // 100 - 20
  });

  it('returns zero profit with no sales', async () => {
    const withdrawalClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };
    const usdtClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '0' }] }),
      release: jest.fn()
    };

    (mockPool.connect as jest.Mock)
      .mockResolvedValueOnce(withdrawalClient) // 1st: getProfitData's client
      .mockResolvedValueOnce(usdtClient);      // 2nd: getTotalUSDTSold's client

    const profit = await BalanceService.getProfitData();

    expect(profit.total_profit).toBe(0);
    expect(profit.available_profit).toBe(0);
    expect(profit.withdrawn_profit).toBe(0);
  });
});

describe('BalanceService.getPendingVESTotal', () => {
  it('returns sum of pending VES orders', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '15000000' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    const total = await BalanceService.getPendingVESTotal();
    expect(total).toBe(15000000);
  });

  it('throws on invalid data', async () => {
    const mockClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: 'bad' }] }),
      release: jest.fn()
    };
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);

    await expect(BalanceService.getPendingVESTotal()).rejects.toThrow();
  });
});

describe('BalanceService.getVESShortfall', () => {
  it('reports shortfall when VES balance is insufficient', async () => {
    // getPendingVESTotal and getDaiVESBalance each need a connect
    const pendingClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '20000000' }] }),
      release: jest.fn()
    };
    const balanceClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '10000000' }] })
        .mockResolvedValueOnce({ rows: [{ total: '5000000' }] }),
      release: jest.fn()
    };

    (mockPool.connect as jest.Mock)
      .mockResolvedValueOnce(pendingClient)
      .mockResolvedValueOnce(balanceClient);

    const shortfall = await BalanceService.getVESShortfall();

    expect(shortfall.pending_total).toBe(20000000);
    expect(shortfall.current_balance).toBe(5000000);
    expect(shortfall.shortfall).toBe(15000000);
    expect(shortfall.is_sufficient).toBe(false);
  });

  it('reports sufficient when VES balance covers pending orders', async () => {
    const pendingClient = {
      query: jest.fn().mockResolvedValue({ rows: [{ total: '5000000' }] }),
      release: jest.fn()
    };
    const balanceClient = {
      query: jest.fn()
        .mockResolvedValueOnce({ rows: [{ total: '20000000' }] })
        .mockResolvedValueOnce({ rows: [{ total: '5000000' }] }),
      release: jest.fn()
    };

    (mockPool.connect as jest.Mock)
      .mockResolvedValueOnce(pendingClient)
      .mockResolvedValueOnce(balanceClient);

    const shortfall = await BalanceService.getVESShortfall();

    expect(shortfall.is_sufficient).toBe(true);
    expect(shortfall.shortfall).toBeLessThanOrEqual(0);
  });
});
