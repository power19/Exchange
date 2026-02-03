import axios from 'axios';
import { CapacitorHttp } from '@capacitor/core';
import { Capacitor } from '@capacitor/core';
import type { Balances, ProfitData, VESShortfall, Purchase, Transfer, Conversion, VESOrder, COPOrder, Withdrawal, Expense, ExchangeRate, CurrentRates, DailyReport, DaiDailyReport, USDTRequest, USDTRequestStatus, BalanceAdjustment, BalanceType } from '../types';

// Simple API base URL - use environment variable or default to /api for web
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Check if running on native platform (bypasses CORS)
const isNative = Capacitor.isNativePlatform();

// CSRF token storage (in memory, not localStorage for security)
let csrfToken: string | null = null;

// Get CSRF token from cookie
function getCSRFTokenFromCookie(): string | null {
  const match = document.cookie.match(/csrf_token=([^;]+)/);
  return match ? match[1] : null;
}

// Set CSRF token (called after login)
export function setCSRFToken(token: string | null) {
  csrfToken = token;
}

// Get current CSRF token (from memory or cookie)
export function getCSRFToken(): string | null {
  return csrfToken || getCSRFTokenFromCookie();
}

// Configure axios defaults for cookie-based auth
axios.defaults.withCredentials = true;

// Unified API client that uses Capacitor HTTP on mobile and axios on web
const api = {
  get: async <T = any>(url: string, config?: any): Promise<{ data: T; status: number; headers: any }> => {
    try {
      const fullUrl = `${API_BASE_URL}${url}`;

      if (isNative) {
        // Use Capacitor HTTP for native platforms (bypasses CORS)
        const response = await CapacitorHttp.get({
          url: fullUrl,
          headers: {
            'Content-Type': 'application/json'
          },
          webFetchExtra: {
            credentials: 'include'
          },
          params: config?.params
        });
        return { data: response.data as T, status: response.status, headers: response.headers };
      } else {
        // Use axios for web (credentials included by default)
        const response = await axios.get(fullUrl, {
          headers: {
            'Content-Type': 'application/json'
          },
          ...config
        });
        return response;
      }
    } catch (error: any) {
      console.error(`API GET ${url} error:`, error.response?.status || error.message);
      throw error;
    }
  },
  post: async <T = any>(url: string, data: any, config?: any): Promise<{ data: T; status: number; headers: any }> => {
    try {
      const fullUrl = `${API_BASE_URL}${url}`;
      const csrf = getCSRFToken();

      if (isNative) {
        // Use Capacitor HTTP for native platforms
        const response = await CapacitorHttp.post({
          url: fullUrl,
          headers: {
            'Content-Type': 'application/json',
            ...(csrf && { 'X-CSRF-Token': csrf })
          },
          webFetchExtra: {
            credentials: 'include'
          },
          data
        });
        return { data: response.data as T, status: response.status, headers: response.headers };
      } else {
        // Use axios for web
        const response = await axios.post(fullUrl, data, {
          headers: {
            'Content-Type': 'application/json',
            ...(csrf && { 'X-CSRF-Token': csrf })
          },
          ...config
        });
        return response;
      }
    } catch (error: any) {
      console.error(`API POST ${url} error:`, error.response?.status || error.message);
      throw error;
    }
  },
  put: async <T = any>(url: string, data: any, config?: any): Promise<{ data: T; status: number; headers: any }> => {
    try {
      const fullUrl = `${API_BASE_URL}${url}`;
      const csrf = getCSRFToken();

      if (isNative) {
        // Use Capacitor HTTP for native platforms
        const response = await CapacitorHttp.put({
          url: fullUrl,
          headers: {
            'Content-Type': 'application/json',
            ...(csrf && { 'X-CSRF-Token': csrf })
          },
          webFetchExtra: {
            credentials: 'include'
          },
          data
        });
        return { data: response.data as T, status: response.status, headers: response.headers };
      } else {
        // Use axios for web
        return axios.put(fullUrl, data, {
          headers: {
            'Content-Type': 'application/json',
            ...(csrf && { 'X-CSRF-Token': csrf })
          },
          ...config
        });
      }
    } catch (error: any) {
      console.error(`API PUT ${url} error:`, error.response?.status || error.message);
      throw error;
    }
  },
  delete: async <T = any>(url: string, config?: any): Promise<{ data: T; status: number; headers: any }> => {
    try {
      const fullUrl = `${API_BASE_URL}${url}`;
      const csrf = getCSRFToken();

      if (isNative) {
        // Use Capacitor HTTP for native platforms
        const response = await CapacitorHttp.delete({
          url: fullUrl,
          headers: {
            'Content-Type': 'application/json',
            ...(csrf && { 'X-CSRF-Token': csrf })
          },
          webFetchExtra: {
            credentials: 'include'
          }
        });
        return { data: response.data as T, status: response.status, headers: response.headers };
      } else {
        // Use axios for web
        return axios.delete(fullUrl, {
          headers: {
            'Content-Type': 'application/json',
            ...(csrf && { 'X-CSRF-Token': csrf })
          },
          ...config
        });
      }
    } catch (error: any) {
      console.error(`API DELETE ${url} error:`, error.response?.status || error.message);
      throw error;
    }
  }
};

// Balances
export const getBalances = () => api.get<Balances>('/balances');
export const getProfitData = () => api.get<ProfitData>('/balances/profit');
export const getVESShortfall = () => api.get<VESShortfall>('/balances/ves-shortfall');

// Purchases
export const getPurchases = () => api.get<Purchase[]>('/purchases');
export const createPurchase = (data: { amount_usdt: number; fee_percentage: number; total_cost_usd: number; date?: string }) =>
  api.post<Purchase>('/purchases', data);

// Transfers
export const getTransfers = () => api.get<Transfer[]>('/transfers');
export const createTransfer = (data: { amount_usdt: number; date?: string }) =>
  api.post<Transfer>('/transfers', data);

// Conversions
export const getConversions = () => api.get<Conversion[]>('/conversions');
export const createConversion = (data: { usdt_amount: number; exchange_rate: number; date?: string }) =>
  api.post<Conversion>('/conversions', data);

// VES Orders
export const getVESOrders = (status?: 'PENDING' | 'COMPLETED' | 'CANCELLED') =>
  api.get<VESOrder[]>('/ves-orders', { params: { status } });
export const createVESOrder = (data: { customer_name: string; amount_ves: number; date_submitted?: string; bank?: string; phone_number?: string; customer_id?: string; account_number?: string }) =>
  api.post<VESOrder>('/ves-orders', data);
export const fulfillVESOrder = (id: number, data: { exchange_rate?: number; date_completed?: string }) =>
  api.post<VESOrder>(`/ves-orders/${id}/fulfill`, data);
export const updateVESOrder = (id: number, data: Partial<VESOrder>) =>
  api.put<VESOrder>(`/ves-orders/${id}`, data);
export const cancelVESOrder = (id: number) =>
  api.post<VESOrder>(`/ves-orders/${id}/cancel`, {});

// COP Orders
export const getCOPOrders = (status?: 'PENDING' | 'COMPLETED') =>
  api.get<COPOrder[]>('/cop-orders', { params: { status } });
export const createCOPOrder = (data: { customer_name: string; amount_cop: number; date_submitted?: string; bank?: string; phone_number?: string; customer_id?: string; account_number?: string }) =>
  api.post<COPOrder>('/cop-orders', data);
export const fulfillCOPOrder = (id: number, data: { exchange_rate: number; date_completed?: string }) =>
  api.post<COPOrder>(`/cop-orders/${id}/fulfill`, data);
export const updateCOPOrder = (id: number, data: Partial<COPOrder>) =>
  api.put<COPOrder>(`/cop-orders/${id}`, data);
export const cancelCOPOrder = (id: number) =>
  api.post<COPOrder>(`/cop-orders/${id}/cancel`, {});

// Withdrawals
export const getWithdrawals = () => api.get<Withdrawal[]>('/withdrawals');
export const createWithdrawal = (data: { amount_usdt: number; notes?: string; date?: string }) =>
  api.post<Withdrawal>('/withdrawals', data);

// Expenses
export const getExpenses = () => api.get<Expense[]>('/expenses');
export const createExpense = (data: { amount_usd: number; description: string; date?: string }) =>
  api.post<Expense>('/expenses', data);
export const updateExpense = (id: number, data: { amount_usd: number; description: string; date?: string }) =>
  api.put<Expense>(`/expenses/${id}`, data);
export const deleteExpense = (id: number) => api.delete(`/expenses/${id}`);

// Auth - now uses HttpOnly cookies
export const login = async (username: string, password: string) => {
  const response = await api.post<{ success: boolean; user: { username: string; role: string }; csrfToken: string }>('/auth/login', { username, password });
  // Store CSRF token in memory for subsequent requests
  if (response.data.csrfToken) {
    setCSRFToken(response.data.csrfToken);
  }
  return response;
};

export const logout = async () => {
  const response = await api.post('/auth/logout', {});
  setCSRFToken(null);
  return response;
};

export const verifyToken = () => api.get('/auth/verify');

// Exchange Rates
export const getCurrentRates = () => api.get<CurrentRates>('/exchange-rates/current');
export const getCurrentRate = (currency: 'VES' | 'COP') =>
  api.get<ExchangeRate>(`/exchange-rates/current/${currency}`);
export const getRateHistory = (currency: 'VES' | 'COP', limit?: number) =>
  api.get<ExchangeRate[]>(`/exchange-rates/history/${currency}`, { params: { limit } });
export const getTodayRateHistory = (currency: 'VES' | 'COP') =>
  api.get<ExchangeRate[]>(`/exchange-rates/history/today/${currency}`);
export const setExchangeRate = (data: { currency: 'VES' | 'COP'; rate: number; set_by?: string }) =>
  api.post<ExchangeRate>('/exchange-rates', data);

// Reports
export const getDailyReport = (date?: string) =>
  api.get<DailyReport>('/reports/daily', { params: { date } });
export const getOrdersReport = (start_date: string, end_date: string, type?: 'VES' | 'COP') =>
  api.get('/reports/orders', { params: { start_date, end_date, type } });
export const getDaiDailyReport = (date?: string) =>
  api.get<DaiDailyReport>('/reports/daily/dairimar', { params: { date } });

// USDT Requests (Dairimar → Brian)
export const getUSDTRequests = (status?: USDTRequestStatus) =>
  api.get<USDTRequest[]>('/usdt-requests', { params: { status } });
export const createUSDTRequest = (data: { amount_usdt: number; reason: string }) =>
  api.post<USDTRequest>('/usdt-requests', data);
export const approveUSDTRequest = (id: number, notes?: string) =>
  api.post<USDTRequest>(`/usdt-requests/${id}/approve`, { notes });
export const rejectUSDTRequest = (id: number, notes?: string) =>
  api.post<USDTRequest>(`/usdt-requests/${id}/reject`, { notes });

// Device Tokens (Push Notifications)
export const registerDeviceToken = (data: { user_role: string; device_token: string; device_id?: string; platform?: string }) =>
  api.post('/device-tokens/register', data);
export const unregisterDeviceToken = (data: { device_token: string }) =>
  api.post('/device-tokens/unregister', data);

// Balance Adjustments (Admin)
export const getBalanceAdjustments = (balance_type?: BalanceType) =>
  api.get<BalanceAdjustment[]>('/balance-adjustments', { params: { balance_type } });
export const createBalanceAdjustment = (data: { balance_type: BalanceType; amount: number; reason: string; date?: string }) =>
  api.post<BalanceAdjustment>('/balance-adjustments', data);
export const deleteBalanceAdjustment = (id: number) =>
  api.delete(`/balance-adjustments/${id}`);
