import { PoolClient } from 'pg';
import pool from '../database/connection';
import { BalanceService } from './balanceService';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export class ValidationService {
  /**
   * Validate if deleting a transaction would cause negative balances
   */
  static async canDelete(tableName: string, recordId: number): Promise<ValidationResult> {
    const client = await pool.connect();
    try {
      // Fetch the record to be deleted
      const recordResult = await client.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [recordId]
      );

      if (recordResult.rows.length === 0) {
        return { valid: false, errors: ['Record not found'] };
      }

      const record = recordResult.rows[0];

      // Calculate what balances would be WITHOUT this transaction
      const impacts = await this.calculateDeletionImpact(client, tableName, record);

      const errors: string[] = [];

      if (impacts.brianUSDT !== undefined && impacts.brianUSDT < 0) {
        errors.push(`Deletion would make Brian's USDT balance negative: ${impacts.brianUSDT.toFixed(2)}`);
      }

      if (impacts.daiUSDT !== undefined && impacts.daiUSDT < 0) {
        errors.push(`Deletion would make Dairimar's USDT balance negative: ${impacts.daiUSDT.toFixed(2)}`);
      }

      if (impacts.daiVES !== undefined && impacts.daiVES < 0) {
        errors.push(`Deletion would make Dairimar's VES balance negative: ${impacts.daiVES.toFixed(0)}`);
      }

      if (impacts.profit !== undefined && impacts.profit < 0) {
        errors.push(`Deletion would make available profit negative: ${impacts.profit.toFixed(2)}`);
      }

      return { valid: errors.length === 0, errors };

    } finally {
      client.release();
    }
  }

  /**
   * Validate if updating a transaction is safe
   */
  static async canUpdate(tableName: string, recordId: number, updates: any): Promise<ValidationResult> {
    const client = await pool.connect();
    try {
      const currentResult = await client.query(
        `SELECT * FROM ${tableName} WHERE id = $1`,
        [recordId]
      );

      if (currentResult.rows.length === 0) {
        return { valid: false, errors: ['Record not found'] };
      }

      const current = currentResult.rows[0];
      const errors: string[] = [];
      const warnings: string[] = [];

      // Validate amount fields are positive
      if (updates.amount_usdt !== undefined && updates.amount_usdt <= 0) {
        errors.push('USDT amount must be greater than 0');
      }
      if (updates.amount_ves !== undefined && updates.amount_ves <= 0) {
        errors.push('VES amount must be greater than 0');
      }
      if (updates.amount_cop !== undefined && updates.amount_cop <= 0) {
        errors.push('COP amount must be greater than 0');
      }
      if (updates.exchange_rate !== undefined && updates.exchange_rate <= 0) {
        errors.push('Exchange rate must be greater than 0');
      }
      if (updates.fee_percentage !== undefined && (updates.fee_percentage < 0 || updates.fee_percentage > 1)) {
        errors.push('Fee percentage must be between 0 and 1');
      }

      // Calculate net change in balances
      const delta = this.calculateUpdateDelta(tableName, current, updates);

      // Get current balances
      const brianUSDT = await BalanceService.getBrianBalance();
      const daiUSDT = await BalanceService.getDaiUSDTBalance();
      const daiVES = await BalanceService.getDaiVESBalance();
      const profitData = await BalanceService.getProfitData();

      // Check if update would cause negative balances
      if (delta.brianUSDT && (brianUSDT + delta.brianUSDT) < 0) {
        errors.push(`Update would make Brian's USDT balance negative: ${(brianUSDT + delta.brianUSDT).toFixed(2)}`);
      }
      if (delta.daiUSDT && (daiUSDT + delta.daiUSDT) < 0) {
        errors.push(`Update would make Dairimar's USDT balance negative: ${(daiUSDT + delta.daiUSDT).toFixed(2)}`);
      }
      if (delta.daiVES && (daiVES + delta.daiVES) < 0) {
        errors.push(`Update would make Dairimar's VES balance negative: ${(daiVES + delta.daiVES).toFixed(0)}`);
      }
      if (delta.profit && (profitData.available_profit + delta.profit) < 0) {
        errors.push(`Update would make available profit negative: ${(profitData.available_profit + delta.profit).toFixed(2)}`);
      }

      // Special warnings for order status changes
      if ((tableName === 'ves_orders' || tableName === 'cop_orders') &&
          updates.status === 'PENDING' && current.status === 'COMPLETED') {
        warnings.push('Reverting COMPLETED order to PENDING will affect profit calculations');
      }

      return { valid: errors.length === 0, errors, warnings };

    } finally {
      client.release();
    }
  }

  /**
   * Calculate balance impacts if a transaction is deleted
   */
  private static async calculateDeletionImpact(client: PoolClient, tableName: string, record: any) {
    const impacts: any = {};

    // Get current balances
    const brianUSDT = await BalanceService.getBrianBalance();
    const daiUSDT = await BalanceService.getDaiUSDTBalance();
    const daiVES = await BalanceService.getDaiVESBalance();
    const profitData = await BalanceService.getProfitData();

    switch (tableName) {
      case 'purchases':
        // Removing purchase reduces Brian's USDT
        impacts.brianUSDT = brianUSDT - parseFloat(record.amount_usdt);
        break;

      case 'transfers':
        // Removing transfer: Brian gains back, Dai loses
        impacts.brianUSDT = brianUSDT + parseFloat(record.amount_usdt);
        impacts.daiUSDT = daiUSDT - parseFloat(record.amount_usdt);
        break;

      case 'conversions':
        // Removing conversion: Dai gains USDT back, loses VES
        impacts.daiUSDT = daiUSDT + parseFloat(record.usdt_amount);
        impacts.daiVES = daiVES - parseFloat(record.ves_received);
        break;

      case 'ves_orders':
        if (record.status === 'COMPLETED') {
          // Removing completed order: Dai gains VES back, profit decreases
          impacts.daiVES = daiVES + parseFloat(record.amount_ves);
          impacts.profit = profitData.available_profit - (parseFloat(record.usdt_sold || 0) * 0.10);
        }
        break;

      case 'cop_orders':
        if (record.status === 'COMPLETED') {
          // Removing completed order: Brian gains USDT back, profit decreases
          impacts.brianUSDT = brianUSDT + parseFloat(record.usdt_sold || 0);
          impacts.profit = profitData.available_profit - (parseFloat(record.usdt_sold || 0) * 0.10);
        }
        break;

      case 'withdrawals':
        // Removing withdrawal increases available profit
        impacts.profit = profitData.available_profit + parseFloat(record.amount_usdt);
        break;
    }

    return impacts;
  }

  /**
   * Calculate net change in balances from an update
   */
  private static calculateUpdateDelta(tableName: string, current: any, updates: any) {
    const delta: any = {};

    switch (tableName) {
      case 'purchases':
        if (updates.amount_usdt !== undefined) {
          const diff = parseFloat(updates.amount_usdt) - parseFloat(current.amount_usdt);
          delta.brianUSDT = diff;
        }
        break;

      case 'transfers':
        if (updates.amount_usdt !== undefined) {
          const diff = parseFloat(updates.amount_usdt) - parseFloat(current.amount_usdt);
          delta.brianUSDT = -diff;  // Brian loses more/gains back
          delta.daiUSDT = diff;      // Dai gains more/loses back
        }
        break;

      case 'conversions':
        if (updates.usdt_amount !== undefined) {
          const diff = parseFloat(updates.usdt_amount) - parseFloat(current.usdt_amount);
          delta.daiUSDT = -diff;
        }
        if (updates.ves_received !== undefined) {
          const diff = parseFloat(updates.ves_received) - parseFloat(current.ves_received);
          delta.daiVES = diff;
        }
        break;

      case 'ves_orders':
        if (current.status === 'COMPLETED') {
          // Changing amounts on completed order
          if (updates.amount_ves !== undefined) {
            const diff = parseFloat(updates.amount_ves) - parseFloat(current.amount_ves);
            delta.daiVES = -diff;
          }
          if (updates.usdt_sold !== undefined) {
            const diff = parseFloat(updates.usdt_sold) - parseFloat(current.usdt_sold || 0);
            delta.profit = diff * 0.10;
          }
        }
        // Status change from COMPLETED to PENDING
        if (updates.status === 'PENDING' && current.status === 'COMPLETED') {
          delta.daiVES = parseFloat(current.amount_ves);
          delta.profit = -(parseFloat(current.usdt_sold || 0) * 0.10);
        }
        break;

      case 'cop_orders':
        if (current.status === 'COMPLETED') {
          if (updates.usdt_sold !== undefined) {
            const diff = parseFloat(updates.usdt_sold) - parseFloat(current.usdt_sold || 0);
            delta.brianUSDT = -diff;
            delta.profit = diff * 0.10;
          }
        }
        // Status change from COMPLETED to PENDING
        if (updates.status === 'PENDING' && current.status === 'COMPLETED') {
          delta.brianUSDT = parseFloat(current.usdt_sold || 0);
          delta.profit = -(parseFloat(current.usdt_sold || 0) * 0.10);
        }
        break;

      case 'withdrawals':
        if (updates.amount_usdt !== undefined) {
          const diff = parseFloat(updates.amount_usdt) - parseFloat(current.amount_usdt);
          delta.profit = -diff;
        }
        break;
    }

    return delta;
  }
}
