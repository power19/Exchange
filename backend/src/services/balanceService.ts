import pool from '../database/connection';
import { Balances, ProfitData } from '../types';

export class BalanceService {
  /**
   * Calculate Brian's USDT balance
   * Formula: totalPurchased - transferredToDai - soldCOP
   */
  static async getBrianBalance(): Promise<number> {
    const client = await pool.connect();
    try {
      // Total USDT purchased
      const purchasesResult = await client.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM purchases'
      );
      const totalPurchased = parseFloat(purchasesResult.rows[0].total);

      // Total transferred to Dairimar
      const transfersResult = await client.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM transfers'
      );
      const totalTransferred = parseFloat(transfersResult.rows[0].total);

      // Total USDT sold in COP orders (completed only)
      const copSoldResult = await client.query(
        `SELECT COALESCE(SUM(usdt_sold), 0) as total
         FROM cop_orders
         WHERE status = 'COMPLETED'`
      );
      const totalCOPSold = parseFloat(copSoldResult.rows[0].total);

      return totalPurchased - totalTransferred - totalCOPSold;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate Dairimar's USDT balance
   * Formula: receivedFromBrian - convertedToVES
   */
  static async getDaiUSDTBalance(): Promise<number> {
    const client = await pool.connect();
    try {
      // Total received from Brian
      const transfersResult = await client.query(
        'SELECT COALESCE(SUM(amount_usdt), 0) as total FROM transfers'
      );
      const totalReceived = parseFloat(transfersResult.rows[0].total);

      // Total converted to VES
      const conversionsResult = await client.query(
        'SELECT COALESCE(SUM(usdt_amount), 0) as total FROM conversions'
      );
      const totalConverted = parseFloat(conversionsResult.rows[0].total);

      return totalReceived - totalConverted;
    } finally {
      client.release();
    }
  }

  /**
   * Calculate Dairimar's VES balance
   * Formula: totalVESConverted - totalVESSold
   */
  static async getDaiVESBalance(): Promise<number> {
    const client = await pool.connect();
    try {
      // Total VES converted from USDT
      const conversionsResult = await client.query(
        'SELECT COALESCE(SUM(ves_received), 0) as total FROM conversions'
      );
      // Use parseInt for VES amounts since they're BIGINT (no decimals)
      const totalConverted = parseInt(conversionsResult.rows[0].total, 10);

      // Total VES sold in completed orders
      const vesSoldResult = await client.query(
        `SELECT COALESCE(SUM(amount_ves), 0) as total
         FROM ves_orders
         WHERE status = 'COMPLETED'`
      );
      // Use parseInt for VES amounts since they're BIGINT (no decimals)
      const totalSold = parseInt(vesSoldResult.rows[0].total, 10);

      return totalConverted - totalSold;
    } finally {
      client.release();
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
      // Use parseInt for VES amounts since they're BIGINT (no decimals)
      return parseInt(result.rows[0].total, 10);
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
