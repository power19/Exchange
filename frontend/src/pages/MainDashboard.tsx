import { useState, useEffect } from 'react';
import * as api from '../services/api';
import ExchangeRateManager from '../components/ExchangeRateManager';
import DailyReportCard from '../components/DailyReportCard';
import type { Balances, ProfitData, VESOrder, COPOrder, Withdrawal } from '../types';

export default function MainDashboard() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingVESOrders, setPendingVESOrders] = useState<VESOrder[]>([]);
  const [pendingCOPOrders, setPendingCOPOrders] = useState<COPOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [showFulfillForm, setShowFulfillForm] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    checkAuth();
  }, []);

  const loadData = async () => {
    try {
      const [balancesRes, vesOrdersRes, copOrdersRes] = await Promise.all([
        api.getBalances(),
        api.getVESOrders('PENDING'),
        api.getCOPOrders('PENDING')
      ]);

      setBalances(balancesRes.data);
      setPendingVESOrders(vesOrdersRes.data);
      setPendingCOPOrders(copOrdersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      await api.verifyToken();
      setIsAuthenticated(true);
      loadProfitData();
      loadWithdrawals();
    } catch (error) {
      setIsAuthenticated(false);
    }
  };

  const loadProfitData = async () => {
    try {
      const profitRes = await api.getProfitData();
      setProfitData(profitRes.data);
    } catch (error) {
      console.error('Error loading profit data:', error);
    }
  };

  const loadWithdrawals = async () => {
    try {
      const withdrawalsRes = await api.getWithdrawals();
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      console.error('Error loading withdrawals:', error);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      const response = await api.login(username, password);
      localStorage.setItem('authToken', response.data.token);
      setIsAuthenticated(true);
      setShowLogin(false);
      loadProfitData();
      loadWithdrawals();
    } catch (error) {
      alert('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setIsAuthenticated(false);
    setProfitData(null);
    setWithdrawals([]);
  };

  const handleBuyUSDT = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);
    const fee_percentage = parseFloat(formData.get('fee_percentage') as string) / 100; // Convert to decimal
    const total_cost_usd = parseFloat(formData.get('total_cost_usd') as string);

    try {
      await api.createPurchase({ amount_usdt, fee_percentage, total_cost_usd });
      alert('USDT purchase recorded successfully!');
      e.currentTarget.reset();
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || 'Failed to record purchase'}`);
    }
  };

  const handleTransferUSDT = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);

    try {
      await api.createTransfer({ amount_usdt });
      alert('USDT transferred to Dairimar successfully!');
      e.currentTarget.reset();
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || 'Failed to transfer USDT'}`);
    }
  };

  const handleFulfillCOPOrder = async (orderId: number, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const exchange_rate = parseFloat(formData.get('exchange_rate') as string);

    try {
      await api.fulfillCOPOrder(orderId, { exchange_rate });
      alert('COP order fulfilled successfully!');
      setShowFulfillForm(null);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || 'Failed to fulfill order'}`);
    }
  };

  const handleWithdrawProfit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);
    const notes = formData.get('notes') as string;

    try {
      await api.createWithdrawal({ amount_usdt, notes });
      alert('Profit withdrawn successfully!');
      e.currentTarget.reset();
      loadProfitData();
      loadWithdrawals();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || 'Failed to withdraw profit'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">USDT Exchange Tracker - Main Dashboard</h1>
          <div>
            {isAuthenticated ? (
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={() => setShowLogin(!showLogin)}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Login Form */}
        {showLogin && !isAuthenticated && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4">Login to View Profit Data</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Username</label>
                <input
                  type="text"
                  name="username"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Login
              </button>
            </form>
          </div>
        )}

        {/* Exchange Rate Management */}
        <div className="mb-8">
          <ExchangeRateManager />
        </div>

        {/* Daily Report */}
        <div className="mb-8">
          <DailyReportCard />
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Brian's USDT Balance</h3>
            <p className="text-3xl font-bold text-blue-600">
              {balances?.brian_usdt.toFixed(2)} USDT
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Dairimar's USDT Balance</h3>
            <p className="text-3xl font-bold text-green-600">
              {balances?.dai_usdt.toFixed(2)} USDT
            </p>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Dairimar's VES Balance</h3>
            <p className="text-3xl font-bold text-purple-600">
              {balances?.dai_ves.toLocaleString()} VES
            </p>
          </div>
        </div>

        {/* Profit Data (Private - only visible after login) */}
        {isAuthenticated && profitData && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow-lg p-6 mb-8 border-2 border-green-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">💰 Profit Dashboard (Private)</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600">Total Profit Earned</p>
                <p className="text-2xl font-bold text-green-600">
                  {profitData.total_profit.toFixed(2)} USDT
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Available Balance</p>
                <p className="text-2xl font-bold text-blue-600">
                  {profitData.available_profit.toFixed(2)} USDT
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Withdrawn</p>
                <p className="text-2xl font-bold text-gray-600">
                  {profitData.withdrawn_profit.toFixed(2)} USDT
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total USDT Sold</p>
                <p className="text-2xl font-bold text-purple-600">
                  {profitData.total_usdt_sold.toFixed(2)} USDT
                </p>
              </div>
            </div>

            {/* Withdrawal Form */}
            <div className="bg-white rounded-lg p-4 border-2 border-green-300">
              <h3 className="text-lg font-bold text-gray-800 mb-3">💸 Withdraw Profit</h3>
              <form onSubmit={handleWithdrawProfit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Amount (USDT)</label>
                    <input
                      type="number"
                      name="amount_usdt"
                      step="0.01"
                      min="0.01"
                      max={profitData.available_profit || undefined}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
                      required
                      placeholder="e.g., 50.00"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Available: {profitData.available_profit.toFixed(2)} USDT
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes (Optional)</label>
                    <input
                      type="text"
                      name="notes"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
                      placeholder="e.g., Monthly withdrawal"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full md:w-auto px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                >
                  Withdraw Profit
                </button>
              </form>
            </div>

            {/* Withdrawal History */}
            {withdrawals.length > 0 && (
              <div className="bg-white rounded-lg p-4 border-2 border-blue-300 mt-4">
                <h3 className="text-lg font-bold text-gray-800 mb-3">📜 Withdrawal History</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {withdrawals.map((withdrawal) => (
                        <tr key={withdrawal.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(withdrawal.date).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-green-600">
                            {parseFloat(withdrawal.amount_usdt as any).toFixed(2)} USDT
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {withdrawal.notes || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Buy USDT Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">💵 Buy USDT</h3>
            <form onSubmit={handleBuyUSDT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">USDT Amount</label>
                <input
                  type="number"
                  name="amount_usdt"
                  step="0.01"
                  min="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  required
                  placeholder="e.g., 1000.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Fee Percentage (%)</label>
                <input
                  type="number"
                  name="fee_percentage"
                  step="0.01"
                  min="0"
                  max="100"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  required
                  placeholder="e.g., 4.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Cost (USD)</label>
                <input
                  type="number"
                  name="total_cost_usd"
                  step="0.01"
                  min="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                  required
                  placeholder="e.g., 1040.00"
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Record Purchase
              </button>
            </form>
          </div>

          {/* Transfer USDT to Dairimar Form */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">↗️ Transfer USDT to Dairimar</h3>
            <form onSubmit={handleTransferUSDT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Amount (USDT)</label>
                <input
                  type="number"
                  name="amount_usdt"
                  step="0.01"
                  min="0.01"
                  max={balances?.brian_usdt || undefined}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 px-3 py-2 border"
                  required
                  placeholder="e.g., 500.00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available: {balances?.brian_usdt.toFixed(2)} USDT
                </p>
              </div>
              <button
                type="submit"
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Transfer to Dairimar
              </button>
            </form>
          </div>
        </div>

        {/* Pending Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Pending VES Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Pending VES Orders ({pendingVESOrders.length})
            </h3>
            <div className="space-y-2">
              {pendingVESOrders.length === 0 ? (
                <p className="text-gray-500">No pending VES orders</p>
              ) : (
                pendingVESOrders.map((order) => (
                  <div key={order.id} className="border-l-4 border-purple-500 pl-4 py-2">
                    <p className="font-semibold">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">
                      {parseFloat(order.amount_ves as any).toLocaleString()} VES
                    </p>
                    <p className="text-xs text-gray-500">
                      Submitted: {new Date(order.date_submitted).toLocaleDateString()}
                    </p>
                    {/* Customer Payment Info */}
                    {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                      <div className="mt-2 text-xs text-gray-500 space-y-1">
                        {order.bank && <p>🏦 {order.bank}</p>}
                        {order.phone_number && <p>📱 {order.phone_number}</p>}
                        {order.customer_id && <p>🆔 {order.customer_id}</p>}
                        {order.account_number && <p>💳 {order.account_number}</p>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending COP Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              Pending COP Orders ({pendingCOPOrders.length})
            </h3>
            <div className="space-y-4">
              {pendingCOPOrders.length === 0 ? (
                <p className="text-gray-500">No pending COP orders</p>
              ) : (
                pendingCOPOrders.map((order) => (
                  <div key={order.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-lg">{order.customer_name}</p>
                        <p className="text-gray-600">{parseFloat(order.amount_cop as any).toLocaleString()} COP</p>
                        <p className="text-sm text-gray-500">
                          Submitted: {new Date(order.date_submitted).toLocaleDateString()}
                        </p>
                        {/* Customer Payment Info */}
                        {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                          <div className="mt-2 pt-2 border-t text-sm text-gray-600 space-y-1">
                            <p className="font-medium text-gray-700">Customer Payment Info:</p>
                            {order.bank && <p>🏦 Bank: {order.bank}</p>}
                            {order.phone_number && <p>📱 Phone: {order.phone_number}</p>}
                            {order.customer_id && <p>🆔 ID: {order.customer_id}</p>}
                            {order.account_number && <p>💳 Account: {order.account_number}</p>}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => setShowFulfillForm(order.id)}
                        className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        Fulfill
                      </button>
                    </div>

                    {showFulfillForm === order.id && (
                      <form onSubmit={(e) => handleFulfillCOPOrder(order.id, e)} className="mt-4 pt-4 border-t">
                        <div className="space-y-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Exchange Rate (COP/USDT)
                            </label>
                            <input
                              type="number"
                              name="exchange_rate"
                              step="0.01"
                              min="0.01"
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border"
                              required
                              placeholder="e.g., 4000.00"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              USDT to be sold: {(order.amount_cop / 4000).toFixed(2)} (at 4000 rate example)
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              type="submit"
                              className="flex-1 px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 text-sm"
                            >
                              Confirm Fulfillment
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowFulfillForm(null)}
                              className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Development Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-800">
            <strong>Dev Mode:</strong> This is the Main Dashboard (Brian's view).
            Access other dashboards: <a href="/patty" className="underline">Patty</a> | <a href="/dairimar" className="underline">Dairimar</a>
          </p>
        </div>
      </main>
    </div>
  );
}
