import pool from '../database/connection';
import { Balances, ProfitData } from '../types';

export class BalanceService {
  /**
   * Get balance adjustment for a specific account and currency
   * @param account Account name: 'brian' or 'dairimar'
   * @param currency Currency: 'USDT' or 'VES'
   * @param client Optional database client for transaction-safe balance checking
   */
  static async getAdjustment(account: string, currency: string, client?: any): Promise<number> {
    const useClient = client || await pool.connect();
    const shouldRelease = !client;

    try {
      const result = await useClient.query(
        `SELECT COALESCE(SUM(adjustment_amount), 0) as total FROM balance_adjustments WHERE account = $1 AND currency = $2`,
        [account, currency]
      );
      return parseFloat(result.rows[0].total);
    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  }

  /**
   * Calculate Brian's USDT balance
   * Formula: totalPurchased - transferredToDai - soldCOP + adjustments
   *
   * @param client Optional database client for transaction-safe balance checking
   */
  static async getBrianBalance(client?: any): Promise<number> {
    const useClient = client || await pool.connect();
    const shouldRelease = !client;

    try {
      // Total USDT purchased
      const purchasesResult = await useClient.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM purchases'
      );
      const totalPurchased = parseFloat(purchasesResult.rows[0].total);

      // Total transferred to Dairimar
      const transfersResult = await useClient.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM transfers'
      );
      const totalTransferred = parseFloat(transfersResult.rows[0].total);

      // Total USDT sold in COP orders (completed only)
      const copSoldResult = await useClient.query(
        `SELECT COALESCE(SUM(usdt_sold), 0) as total
         FROM cop_orders
         WHERE status = 'COMPLETED'`
      );
      const totalCOPSold = parseFloat(copSoldResult.rows[0].total);

      // Get any balance adjustments
      const adjustment = await this.getAdjustment('brian', 'USDT', useClient);

      return totalPurchased - totalTransferred - totalCOPSold + adjustment;
    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  }

  /**
   * Calculate Dairimar's USDT balance
   * Formula: receivedFromBrian - convertedToVES + adjustments
   *
   * @param client Optional database client for transaction-safe balance checking
   */
  static async getDaiUSDTBalance(client?: any): Promise<number> {
    const useClient = client || await pool.connect();
    const shouldRelease = !client;

    try {
      // Total received from Brian
      const transfersResult = await useClient.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM transfers'
      );
      const totalReceived = parseFloat(transfersResult.rows[0].total);

      // Total converted to VES
      const conversionsResult = await useClient.query(
        'SELECT COALESCE(SUM(usdt_amount), 0) as total FROM conversions'
      );
      const totalConverted = parseFloat(conversionsResult.rows[0].total);

      // Get any balance adjustments
      const adjustment = await this.getAdjustment('dairimar', 'USDT', useClient);

      return totalReceived - totalConverted + adjustment;
    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  }

  /**
   * Calculate Dairimar's VES balance
   * Formula: totalVESConverted - totalVESSold + adjustments
   *
   * @param client Optional database client for transaction-safe balance checking
   */
  static async getDaiVESBalance(client?: any): Promise<number> {
    const useClient = client || await pool.connect();
    const shouldRelease = !client; // Only release if we created the connection

    try {
      // Total VES converted from USDT
      const conversionsResult = await useClient.query(
        'SELECT COALESCE(SUM(ves_received), 0) as total FROM conversions'
      );
      // PostgreSQL SUM() on BIGINT returns NUMERIC, which may be returned as string
      // Convert to number safely, handling both string and number returns
      const totalConvertedRaw = conversionsResult.rows[0].total;
      const totalConverted = typeof totalConvertedRaw === 'string'
        ? parseInt(totalConvertedRaw, 10)
        : Number(totalConvertedRaw);

      // Total VES sold in completed orders
      const vesSoldResult = await useClient.query(
        `SELECT COALESCE(SUM(amount_ves), 0) as total
         FROM ves_orders
         WHERE status = 'COMPLETED'`
      );
      // Convert to number safely, handling both string and number returns
      const totalSoldRaw = vesSoldResult.rows[0].total;
      const totalSold = typeof totalSoldRaw === 'string'
        ? parseInt(totalSoldRaw, 10)
        : Number(totalSoldRaw);

      // Verify we don't have NaN values
      if (isNaN(totalConverted) || isNaN(totalSold)) {
        throw new Error(`Invalid VES balance calculation: converted=${totalConvertedRaw}, sold=${totalSoldRaw}`);
      }

      // Get any balance adjustments (VES adjustments are stored as integers)
      const adjustment = await this.getAdjustment('dairimar', 'VES', useClient);
      const adjustmentInt = Math.round(adjustment); // Ensure integer for VES

      return totalConverted - totalSold + adjustmentInt;
    } finally {
      if (shouldRelease) {
        useClient.release();
      }
    }
  }

  /**
   * Get all balances at once
   */
  static async getAllBalances(): Promise<Balances> {
    const [brian_usdt, dai_usdt, dai_ves] = await Promise.all([
      this.getBrianBalance(),
      this.getDaiUSDTBalance(),
      this.getDaiVESBalance()
    ]);

    return {
      brian_usdt,
      dai_usdt,
      dai_ves
    };
  }

  /**
   * Calculate total USDT sold (for profit calculation)
   * Formula: sum(completed_ves_orders.usdt_sold) + sum(completed_cop_orders.usdt_sold)
   */
  static async getTotalUSDTSold(): Promise<number> {
    const client = await pool.connect();
    try {
      // VES orders USDT sold
      const vesResult = await client.query(
        `SELECT COALESCE(SUM(usdt_sold), 0) as total
         FROM ves_orders
         WHERE status = 'COMPLETED'`
      );
      const vesTotal = parseFloat(vesResult.rows[0].total);

      // COP orders USDT sold
      const copResult = await client.query(
        `SELECT COALESCE(SUM(usdt_sold), 0) as total
         FROM cop_orders
         WHERE status = 'COMPLETED'`
      );
      const copTotal = parseFloat(copResult.rows[0].total);

      return vesTotal + copTotal;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate profit data (PRIVATE - Brian only)
   * Total profit = Total USDT Sold * 10%
   */
  static async getProfitData(): Promise<ProfitData> {
    const client = await pool.connect();
    try {
      const totalUSDTSold = await this.getTotalUSDTSold();
      const totalProfit = totalUSDTSold * 0.10;

      // Total withdrawn
      const withdrawalsResult = await client.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM withdrawals'
      );
      const withdrawnProfit = parseFloat(withdrawalsResult.rows[0].total);

      const availableProfit = totalProfit - withdrawnProfit;

      return {
        total_profit: totalProfit,
        available_profit: availableProfit,
        withdrawn_profit: withdrawnProfit,
        total_usdt_sold: totalUSDTSold
      };
    } finally {
      client.release();
    }
  }

  /**
   * Calculate pending VES orders total
   */
  static async getPendingVESTotal(): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT COALESCE(SUM(amount_ves), 0) as total
         FROM ves_orders
         WHERE status = 'PENDING'`
      );
      // PostgreSQL SUM() on BIGINT returns NUMERIC, which may be returned as string
      // Convert to number safely, handling both string and number returns
      const totalRaw = result.rows[0].total;
      const total = typeof totalRaw === 'string'
        ? parseInt(totalRaw, 10)
        : Number(totalRaw);

      if (isNaN(total)) {
        throw new Error(`Invalid pending VES total calculation: ${totalRaw}`);
      }

      return total;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate VES shortfall/sufficient for Dairimar's dashboard
   */
  static async getVESShortfall(): Promise<{
    pending_total: number;
    current_balance: number;
    shortfall: number;
    is_sufficient: boolean;
  }> {
    const [pendingTotal, currentBalance] = await Promise.all([
      this.getPendingVESTotal(),
      this.getDaiVESBalance()
    ]);

    const shortfall = pendingTotal - currentBalance;

    return {
      pending_total: pendingTotal,
      current_balance: currentBalance,
      shortfall: shortfall,
      is_sufficient: shortfall <= 0
    };
  }
}
