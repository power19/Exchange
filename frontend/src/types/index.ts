export type OrderStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';

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

export interface Purchase {
  id: number;
  date: string;
  amount_usdt: number;
  fee_percentage: number;
  total_cost_usd: number;
  status: string;
}

export interface Transfer {
  id: number;
  date: string;
  amount_usdt: number;
}

export interface Conversion {
  id: number;
  date: string;
  usdt_amount: number;
  ves_received: number;
  exchange_rate: number;
}

export interface VESOrder {
  id: number;
  date_submitted: string;
  customer_name: string;
  amount_ves: number;
  bank?: string;
  phone_number?: string;
  customer_id?: string;
  account_number?: string;
  status: OrderStatus;
  exchange_rate?: number;
  usdt_sold?: number;
  date_completed?: string;
}

export interface COPOrder {
  id: number;
  date_submitted: string;
  customer_name: string;
  amount_cop: number;
  bank?: string;
  phone_number?: string;
  customer_id?: string;
  account_number?: string;
  status: OrderStatus;
  exchange_rate?: number;
  usdt_sold?: number;
  date_completed?: string;
}

export interface Withdrawal {
  id: number;
  date: string;
  amount_usdt: number;
  notes?: string;
}

export interface Expense {
  id: number;
  date: string;
  amount_usd: number;
  description: string;
}

export type USDTRequestStatus = 'PENDING' | 'FULFILLED' | 'REJECTED';

export interface USDTRequest {
  id: number;
  date_requested: string;
  amount_usdt: number;
  reason: string;
  status: USDTRequestStatus;
  date_resolved?: string;
  notes?: string;
}

export interface VESShortfall {
  pending_total: number;
  current_balance: number;
  shortfall: number;
  is_sufficient: boolean;
}

export interface ExchangeRate {
  id: number;
  currency: 'VES' | 'COP';
  rate: number;
  set_by: string;
  is_active: boolean;
  created_at: string;
  orders_count?: number;
}

export interface CurrentRates {
  VES: ExchangeRate | null;
  COP: ExchangeRate | null;
}

export interface DailyReport {
  date: string;
  starting_balances: {
    brian_usdt: number;
    dai_usdt: number;
    dai_ves: number;
  };
  ves_orders: {
    count: number;
    total_ves: number;
    total_usdt: number;
  };
  cop_orders: {
    count: number;
    total_cop: number;
    total_usdt: number;
  };
  total_usdt_sold: number;
  purchases: {
    count: number;
    total_usdt: number;
    total_cost: number;
  };
  transfers: {
    count: number;
    total_usdt: number;
  };
  conversions: {
    count: number;
    total_usdt: number;
    total_ves: number;
  };
  profit: {
    gross: number;
  };
}

export interface DaiDailyReportOrder {
  id: number;
  customer_name: string;
  amount_ves: number;
  exchange_rate: number;
  usdt_sold: number;
  date_submitted: string;
  date_completed: string;
  bank?: string;
  phone_number?: string;
  customer_id?: string;
  account_number?: string;
}

export interface DaiDailyReportConversion {
  id: number;
  usdt_amount: number;
  ves_received: number;
  exchange_rate: number;
  date: string;
}

export interface DaiDailyReport {
  date: string;
  starting_balances: {
    dai_usdt: number;
    dai_ves: number;
  };
  ves_orders: {
    count: number;
    total_ves: number;
    total_usdt: number;
    orders: DaiDailyReportOrder[];
  };
  conversions: {
    count: number;
    total_usdt: number;
    total_ves: number;
    items: DaiDailyReportConversion[];
  };
}
