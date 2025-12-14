export type UserRole = 'brian' | 'patty' | 'dairimar';

export type OrderStatus = 'PENDING' | 'COMPLETED';

export interface Purchase {
  id: number;
  date: Date;
  amount_usdt: number;
  fee_percentage: number;
  total_cost_usd: number;
  status: string;
}

export interface Transfer {
  id: number;
  date: Date;
  amount_usdt: number;
}

export interface Conversion {
  id: number;
  date: Date;
  usdt_amount: number;
  ves_received: number;
  exchange_rate: number;
}

export interface VESOrder {
  id: number;
  date_submitted: Date;
  customer_name: string;
  amount_ves: number;
  bank?: string;
  phone_number?: string;
  customer_id?: string;
  account_number?: string;
  status: OrderStatus;
  exchange_rate?: number;
  usdt_sold?: number;
  date_completed?: Date;
}

export interface COPOrder {
  id: number;
  date_submitted: Date;
  customer_name: string;
  amount_cop: number;
  bank?: string;
  phone_number?: string;
  customer_id?: string;
  account_number?: string;
  status: OrderStatus;
  exchange_rate?: number;
  usdt_sold?: number;
  date_completed?: Date;
}

export interface Withdrawal {
  id: number;
  date: Date;
  amount_usdt: number;
  notes?: string;
}

export interface Expense {
  id: number;
  date: Date;
  amount_usd: number;
  description: string;
}

export interface USDTRequest {
  id: number;
  date_requested: Date;
  amount_usdt: number;
  reason: string;
  status: 'PENDING' | 'FULFILLED' | 'REJECTED';
  date_resolved?: Date;
  notes?: string;
}

export interface Balances {
  brian_usdt: number;
  dai_usdt: number;
  dai_ves: number;
}

export interface ProfitData {
  total_profit: number;
  available_profit: number;
  withdrawn_profit: number;
  total_usdt_sold: number;
}

declare global {
  namespace Express {
    interface Request {
      userRole?: UserRole;
    }
  }
}
