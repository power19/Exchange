import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Card, StatCard, Button } from '../components/modern';
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
    const total_cost_usd = parseFloat(formData.get('total_cost_usd') as string);

    // Calculate fee percentage: (total_cost - amount) / amount * 100
    const fee_percentage = ((total_cost_usd - amount_usdt) / amount_usdt);

    try {
      await api.createPurchase({ amount_usdt, fee_percentage, total_cost_usd });
      // Purchase succeeded!
      e.currentTarget.reset();

      // Try to reload data - if it fails, don't break the success flow
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Failed to reload data after purchase:', reloadError);
        // Purchase succeeded but data reload failed - user can refresh manually
      }

      alert(`✅ USDT purchase recorded successfully!\nAmount: ${amount_usdt} USDT\nTotal Cost: $${total_cost_usd}\nFee: ${(fee_percentage * 100).toFixed(2)}%`);
    } catch (error: any) {
      console.error('Purchase error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to record purchase'}`);
    }
  };

  const handleTransferUSDT = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);

    try {
      await api.createTransfer({ amount_usdt });
      // Transfer succeeded!
      e.currentTarget.reset();

      // Try to reload data - if it fails, don't break the success flow
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Failed to reload data after transfer:', reloadError);
      }

      alert(`✅ USDT transferred to Dairimar successfully!\nAmount: ${amount_usdt.toFixed(2)} USDT`);
    } catch (error: any) {
      console.error('Transfer error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to transfer USDT'}`);
    }
  };

  const handleFulfillCOPOrder = async (orderId: number, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const exchange_rate = parseFloat(formData.get('exchange_rate') as string);

    try {
      await api.fulfillCOPOrder(orderId, { exchange_rate });
      // Order fulfilled!
      setShowFulfillForm(null);

      // Try to reload data - if it fails, don't break the success flow
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Failed to reload data after fulfillment:', reloadError);
      }

      alert('✅ COP order fulfilled successfully!');
    } catch (error: any) {
      console.error('Fulfill error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to fulfill order'}`);
    }
  };

  const handleWithdrawProfit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);
    const notes = formData.get('notes') as string;

    try {
      await api.createWithdrawal({ amount_usdt, notes });
      // Withdrawal succeeded!
      e.currentTarget.reset();

      // Try to reload data - if it fails, don't break the success flow
      try {
        await Promise.all([loadProfitData(), loadWithdrawals()]);
      } catch (reloadError) {
        console.error('Failed to reload data after withdrawal:', reloadError);
      }

      alert(`✅ Profit withdrawn successfully!\nAmount: ${amount_usdt.toFixed(2)} USDT`);
    } catch (error: any) {
      console.error('Withdrawal error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to withdraw profit'}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E27] flex items-center justify-center">
        <div className="text-xl text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white">
      {/* Header */}
      <header className="bg-[#151932] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Good Morning, Brian! 👋</h1>
            <p className="text-gray-400 text-sm">USDT Exchange Tracker - Main Dashboard</p>
          </div>
          <div className="flex gap-3">
            {isAuthenticated ? (
              <Button variant="danger" size="sm" onClick={handleLogout}>
                🚪 Logout
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setShowLogin(!showLogin)}>
                🔐 Login
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Login Form */}
        {showLogin && !isAuthenticated && (
          <Card className="mb-8">
            <h2 className="text-xl font-bold mb-4">🔐 Login to View Profit Data</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                <input
                  type="text"
                  name="username"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Password</label>
                <input
                  type="password"
                  name="password"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                />
              </div>
              <Button type="submit" variant="primary" fullWidth>
                Login
              </Button>
            </form>
          </Card>
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
          <StatCard
            title="Your USDT Balance"
            value={`$${balances?.brian_usdt.toFixed(2)}`}
            subtitle="Available to operate"
            color="primary"
            icon={<span className="text-4xl">💰</span>}
          />
          <StatCard
            title="Dairimar's USDT"
            value={`$${balances?.dai_usdt.toFixed(2)}`}
            subtitle="Transferred balance"
            color="success"
            icon={<span className="text-4xl">📤</span>}
          />
          <StatCard
            title="Dairimar's VES"
            value={balances?.dai_ves.toLocaleString() || '0'}
            subtitle="Bolivares available"
            color="warning"
            icon={<span className="text-4xl">🇻🇪</span>}
          />
        </div>

        {/* Profit Data (Private) */}
        {isAuthenticated && profitData && (
          <div className="mb-8">
            <Card className="bg-gradient-to-r from-green-900/30 to-blue-900/30 border-2 border-green-500/30">
              <h2 className="text-2xl font-bold mb-6">💰 Profit Dashboard (Private)</h2>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-[#1a1f3a] rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Profit</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${profitData.total_profit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#1a1f3a] rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Available</p>
                  <p className="text-2xl font-bold text-cyan-400">
                    ${profitData.available_profit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#1a1f3a] rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Withdrawn</p>
                  <p className="text-2xl font-bold text-gray-400">
                    ${profitData.withdrawn_profit.toFixed(2)}
                  </p>
                </div>
                <div className="bg-[#1a1f3a] rounded-xl p-4">
                  <p className="text-sm text-gray-400 mb-1">Total Sold</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ${profitData.total_usdt_sold.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Withdrawal Form */}
              <Card className="bg-[#151932] border border-green-500/20">
                <h3 className="text-lg font-bold mb-4">💸 Withdraw Profit</h3>
                <form onSubmit={handleWithdrawProfit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Amount (USDT)
                      </label>
                      <input
                        type="number"
                        name="amount_usdt"
                        step="0.01"
                        min="0.01"
                        max={profitData.available_profit || undefined}
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                        required
                        placeholder="e.g., 50.00"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Available: ${profitData.available_profit.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Notes (Optional)
                      </label>
                      <input
                        type="text"
                        name="notes"
                        className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                        placeholder="e.g., Monthly withdrawal"
                      />
                    </div>
                  </div>
                  <Button type="submit" variant="success" fullWidth>
                    Withdraw Profit
                  </Button>
                </form>
              </Card>

              {/* Withdrawal History */}
              {withdrawals.length > 0 && (
                <Card className="bg-[#151932] border border-blue-500/20 mt-4">
                  <h3 className="text-lg font-bold mb-4">📜 Withdrawal History</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                            Date
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                            Amount
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                            Notes
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {withdrawals.map((withdrawal) => (
                          <tr key={withdrawal.id}>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {new Date(withdrawal.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium text-green-400">
                              ${parseFloat(withdrawal.amount_usdt as any).toFixed(2)}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {withdrawal.notes || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </Card>
          </div>
        )}

        {/* Action Forms */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Buy USDT */}
          <Card>
            <h3 className="text-xl font-bold mb-4">💵 Buy USDT</h3>
            <form onSubmit={handleBuyUSDT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">USDT Amount</label>
                <input
                  type="number"
                  name="amount_usdt"
                  step="0.01"
                  min="0.01"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                  placeholder="e.g., 1000.00"
                />
                <p className="text-xs text-gray-500 mt-1">How much USDT you're buying</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Total Cost (USD)</label>
                <input
                  type="number"
                  name="total_cost_usd"
                  step="0.01"
                  min="0.01"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                  required
                  placeholder="e.g., 1040.00"
                />
                <p className="text-xs text-gray-500 mt-1">Total amount you paid (including fees)</p>
              </div>
              <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-3">
                <p className="text-xs text-cyan-300">
                  💡 Fee percentage will be calculated automatically
                </p>
              </div>
              <Button type="submit" variant="primary" fullWidth>
                Record Purchase
              </Button>
            </form>
          </Card>

          {/* Transfer USDT */}
          <Card>
            <h3 className="text-xl font-bold mb-4">📤 Transfer to Dairimar</h3>
            <form onSubmit={handleTransferUSDT} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USDT)</label>
                <input
                  type="number"
                  name="amount_usdt"
                  step="0.01"
                  min="0.01"
                  max={balances?.brian_usdt || undefined}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                  required
                  placeholder="e.g., 500.00"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Available: ${balances?.brian_usdt.toFixed(2)}
                </p>
              </div>
              <Button type="submit" variant="success" fullWidth>
                Transfer to Dairimar
              </Button>
            </form>
          </Card>
        </div>

        {/* Pending Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* VES Orders */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">🇻🇪 Pending VES Orders</h3>
              <span className="bg-purple-500/20 text-purple-400 text-xs font-medium px-3 py-1 rounded-full">
                {pendingVESOrders.length} pending
              </span>
            </div>
            <div className="space-y-3">
              {pendingVESOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending orders</p>
              ) : (
                pendingVESOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#151932] rounded-lg p-4 border-l-4 border-purple-500"
                  >
                    <p className="font-semibold text-white">{order.customer_name}</p>
                    <p className="text-sm text-purple-400">
                      {parseFloat(order.amount_ves as any).toLocaleString()} VES
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(order.date_submitted).toLocaleDateString()}
                    </p>
                    {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                      <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400 space-y-1">
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
          </Card>

          {/* COP Orders */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold">🇨🇴 Pending COP Orders</h3>
              <span className="bg-orange-500/20 text-orange-400 text-xs font-medium px-3 py-1 rounded-full">
                {pendingCOPOrders.length} pending
              </span>
            </div>
            <div className="space-y-4">
              {pendingCOPOrders.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No pending orders</p>
              ) : (
                pendingCOPOrders.map((order) => (
                  <div key={order.id} className="bg-[#151932] rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-bold text-white">{order.customer_name}</p>
                        <p className="text-orange-400">
                          {parseFloat(order.amount_cop as any).toLocaleString()} COP
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.date_submitted).toLocaleDateString()}
                        </p>
                        {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                          <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400 space-y-1">
                            {order.bank && <p>🏦 {order.bank}</p>}
                            {order.phone_number && <p>📱 {order.phone_number}</p>}
                            {order.customer_id && <p>🆔 {order.customer_id}</p>}
                            {order.account_number && <p>💳 {order.account_number}</p>}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowFulfillForm(order.id)}
                      >
                        Fulfill
                      </Button>
                    </div>

                    {showFulfillForm === order.id && (
                      <form
                        onSubmit={(e) => handleFulfillCOPOrder(order.id, e)}
                        className="mt-4 pt-4 border-t border-gray-700"
                      >
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Exchange Rate (COP/USDT)
                            </label>
                            <input
                              type="number"
                              name="exchange_rate"
                              step="0.01"
                              min="0.01"
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                              required
                              placeholder="e.g., 4000.00"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              USDT to sell: {(parseFloat(order.amount_cop as any) / 4000).toFixed(2)} (at 4000 rate)
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button type="submit" variant="success" fullWidth size="sm">
                              Confirm
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              fullWidth
                              size="sm"
                              onClick={() => setShowFulfillForm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>

        {/* Development Info */}
        <div className="bg-cyan-500/10 border-l-4 border-cyan-400 p-4 rounded">
          <p className="text-sm text-cyan-300">
            <strong>Main Dashboard</strong> • Access:{' '}
            <a href="/patty" className="underline hover:text-cyan-100">Patty</a> |{' '}
            <a href="/dairimar" className="underline hover:text-cyan-100">Dairimar</a> |{' '}
            <a href="/modern" className="underline hover:text-cyan-100">Design Example</a>
          </p>
        </div>
      </main>
    </div>
  );
}
