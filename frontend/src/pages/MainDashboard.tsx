import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { PushNotificationService } from '../services/pushNotificationService';
import { useSmartRefresh } from '../hooks/useSmartRefresh';
import { Card, StatCard, Button } from '../components/modern';
import ExchangeRateManager from '../components/ExchangeRateManager';
import DailyReportCard from '../components/DailyReportCard';
import OrdersReportCard from '../components/OrdersReportCard';
import type { Balances, ProfitData, VESOrder, COPOrder, Withdrawal, Expense, USDTRequest } from '../types';

export default function MainDashboard() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [profitData, setProfitData] = useState<ProfitData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingVESOrders, setPendingVESOrders] = useState<VESOrder[]>([]);
  const [pendingCOPOrders, setPendingCOPOrders] = useState<COPOrder[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [usdtRequests, setUsdtRequests] = useState<USDTRequest[]>([]);
  const [showFulfillForm, setShowFulfillForm] = useState<number | null>(null);
  const [showRejectForm, setShowRejectForm] = useState<number | null>(null);
  const [showEditForm, setShowEditForm] = useState<{ id: number; type: 'VES' | 'COP' } | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [privateOrderType, setPrivateOrderType] = useState<'VES' | 'COP'>('VES');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'expenses'>('dashboard');

  // Memoized data loading functions
  const loadData = useCallback(async () => {
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
      // Error handled silently
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUSDTRequests = useCallback(async () => {
    try {
      const requestsRes = await api.getUSDTRequests();
      setUsdtRequests(requestsRes.data);
    } catch (error) {
      // Error handled silently
    }
  }, []);

  const loadProfitData = useCallback(async () => {
    try {
      const profitRes = await api.getProfitData();
      setProfitData(profitRes.data);
    } catch (error) {
      // Error handled silently
    }
  }, []);

  const loadWithdrawals = useCallback(async () => {
    try {
      const withdrawalsRes = await api.getWithdrawals();
      setWithdrawals(withdrawalsRes.data);
    } catch (error) {
      // Error handled silently
    }
  }, []);

  const loadExpenses = useCallback(async () => {
    try {
      const expensesRes = await api.getExpenses();
      setExpenses(Array.isArray(expensesRes.data) ? expensesRes.data : []);
    } catch (error) {
      setExpenses([]);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      await api.verifyToken();
      setIsAuthenticated(true);
      loadProfitData();
      loadWithdrawals();
      loadExpenses();
    } catch (error) {
      setIsAuthenticated(false);
    }
  }, [loadProfitData, loadWithdrawals, loadExpenses]);

  // Combined refresh function for smart refresh
  const refreshAll = useCallback(async () => {
    await Promise.all([loadData(), loadUSDTRequests()]);
  }, [loadData, loadUSDTRequests]);

  // Smart refresh: only refresh when tab is visible and focused
  useSmartRefresh({
    onRefresh: refreshAll,
    interval: 30000,
    enabled: true
  });

  useEffect(() => {
    loadData();
    loadUSDTRequests();
    checkAuth();

    // Initialize push notifications (mobile only)
    PushNotificationService.initialize('brian');

    // Cleanup on unmount
    return () => {
      PushNotificationService.unregister();
    };
  }, [loadData, loadUSDTRequests, checkAuth]);

  // Load expenses when switching to expenses tab
  useEffect(() => {
    if (activeTab === 'expenses' && isAuthenticated) {
      loadExpenses();
    }
  }, [activeTab, isAuthenticated, loadExpenses]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get('username') as string;
    const password = formData.get('password') as string;

    try {
      await api.login(username, password);
      // Auth token is now stored in HttpOnly cookie by the server
      setIsAuthenticated(true);
      setShowLogin(false);
      loadProfitData();
      loadWithdrawals();
    } catch (error) {
      alert('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
    setIsAuthenticated(false);
    setProfitData(null);
    setWithdrawals([]);
  };

  const handleBuyUSDT = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget; // Save reference before async operations
    const formData = new FormData(form);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);
    const total_cost_usd = parseFloat(formData.get('total_cost_usd') as string);

    // Calculate fee percentage: (total_cost - amount) / amount * 100
    const fee_percentage = ((total_cost_usd - amount_usdt) / amount_usdt);

    try {
      await api.createPurchase({ amount_usdt, fee_percentage, total_cost_usd });
      // Purchase succeeded!
      form.reset(); // Use saved reference

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
    const form = e.currentTarget; // Save reference before async operations
    const formData = new FormData(form);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);

    try {
      await api.createTransfer({ amount_usdt });
      // Transfer succeeded!
      form.reset(); // Use saved reference

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
    const form = e.currentTarget; // Save reference before async operations
    const formData = new FormData(form);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);
    const notes = formData.get('notes') as string;

    try {
      await api.createWithdrawal({ amount_usdt, notes });
      // Withdrawal succeeded!
      form.reset(); // Use saved reference

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

  const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount_usd = parseFloat(formData.get('amount_usd') as string);
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    try {
      await api.createExpense({ amount_usd, description, date });
      form.reset();
      await loadExpenses();
      alert(`✅ Expense recorded successfully!\nAmount: $${amount_usd.toFixed(2)}`);
    } catch (error: any) {
      console.error('Expense error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to record expense';
      alert(`❌ Error: ${errorMsg}\n\nPlease make sure you're logged in.`);
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingExpense) return;

    const form = e.currentTarget;
    const formData = new FormData(form);
    const amount_usd = parseFloat(formData.get('amount_usd') as string);
    const description = formData.get('description') as string;
    const date = formData.get('date') as string;

    try {
      await api.updateExpense(editingExpense.id, { amount_usd, description, date });
      setEditingExpense(null);
      await loadExpenses();
      alert(`✅ Expense updated successfully!\nAmount: $${amount_usd.toFixed(2)}`);
    } catch (error: any) {
      console.error('Update expense error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to update expense'}`);
    }
  };

  const handleDeleteExpense = async (id: number, description: string) => {
    const confirmed = confirm(`Are you sure you want to delete this expense?\n\n"${description}"`);
    if (!confirmed) return;

    try {
      await api.deleteExpense(id);
      await loadExpenses();
      alert('✅ Expense deleted successfully!');
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to delete expense'}`);
    }
  };

  const handleApproveUSDTRequest = async (requestId: number, notes?: string) => {
    try {
      const response = await api.approveUSDTRequest(requestId, notes);

      alert(`✅ USDT Request approved!\n\nAmount: ${response.data.amount_usdt} USDT transferred to Dairimar`);

      // Try to reload data
      try {
        await Promise.all([loadData(), loadUSDTRequests()]);
      } catch (reloadError) {
        console.error('Failed to reload data after approval:', reloadError);
      }
    } catch (error: any) {
      console.error('Approval error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to approve request';
      const details = error.response?.data?.shortfall
        ? `\n\nShortfall: ${error.response.data.shortfall} USDT\nCurrent Balance: ${error.response.data.current_balance} USDT`
        : '';
      alert(`❌ Error: ${errorMsg}${details}`);
    }
  };

  const handleRejectUSDTRequest = async (requestId: number, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const notes = (formData.get('notes') as string).trim();

    if (!notes || notes.length < 5) {
      alert('❌ Rejection reason must be at least 5 characters long');
      return;
    }

    try {
      await api.rejectUSDTRequest(requestId, notes);

      alert('✅ USDT Request rejected');
      setShowRejectForm(null);

      // Try to reload data
      try {
        await loadUSDTRequests();
      } catch (reloadError) {
        console.error('Failed to reload requests after rejection:', reloadError);
      }
    } catch (error: any) {
      console.error('Rejection error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to reject request'}`);
    }
  };

  const handleCancelOrder = async (orderId: number, orderType: 'VES' | 'COP', customerName: string) => {
    const confirmed = confirm(`Are you sure you want to cancel this ${orderType} order for ${customerName}?`);
    if (!confirmed) return;

    try {
      if (orderType === 'VES') {
        await api.cancelVESOrder(orderId);
      } else {
        await api.cancelCOPOrder(orderId);
      }

      alert('✅ Order cancelled successfully!');

      // Try to reload data
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Failed to reload data after cancel:', reloadError);
      }
    } catch (error: any) {
      console.error('Cancel error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to cancel order'}`);
    }
  };

  const handleEditOrder = async (orderId: number, orderType: 'VES' | 'COP', e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const updateData: any = {
      customer_name: formData.get('customer_name') as string,
      bank: (formData.get('bank') as string)?.trim() || undefined,
      phone_number: (formData.get('phone_number') as string)?.trim() || undefined,
      customer_id: (formData.get('customer_id') as string)?.trim() || undefined,
      account_number: (formData.get('account_number') as string)?.trim() || undefined,
    };

    if (orderType === 'VES') {
      updateData.amount_ves = parseFloat(formData.get('amount_ves') as string);
    } else {
      updateData.amount_cop = parseFloat(formData.get('amount_cop') as string);
    }

    try {
      if (orderType === 'VES') {
        await api.updateVESOrder(orderId, updateData);
      } else {
        await api.updateCOPOrder(orderId, updateData);
      }

      alert('✅ Order updated successfully!');
      setShowEditForm(null);

      // Try to reload data
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Failed to reload data after edit:', reloadError);
      }
    } catch (error: any) {
      console.error('Edit error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to update order'}`);
    }
  };

  const handleCreatePrivateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const customer_name = formData.get('customer_name') as string;
    const bank = (formData.get('bank') as string)?.trim() || undefined;
    const phone_number = (formData.get('phone_number') as string)?.trim() || undefined;
    const customer_id = (formData.get('customer_id') as string)?.trim() || undefined;
    const account_number = (formData.get('account_number') as string)?.trim() || undefined;

    try {
      if (privateOrderType === 'VES') {
        const amount_ves = parseFloat(formData.get('amount_ves') as string);
        await api.createVESOrder({
          customer_name,
          amount_ves,
          bank,
          phone_number,
          customer_id,
          account_number
        });

        alert(`✅ Private VES order created successfully!\n\nCustomer: ${customer_name}\nAmount: ${amount_ves.toLocaleString()} VES`);
      } else {
        const amount_cop = parseFloat(formData.get('amount_cop') as string);
        await api.createCOPOrder({
          customer_name,
          amount_cop,
          bank,
          phone_number,
          customer_id,
          account_number
        });

        alert(`✅ Private COP order created successfully!\n\nCustomer: ${customer_name}\nAmount: ${amount_cop.toLocaleString()} COP`);
      }

      form.reset();

      // Try to reload data
      try {
        await loadData();
      } catch (reloadError) {
        console.error('Failed to reload data after creating private order:', reloadError);
      }
    } catch (error: any) {
      console.error('Create private order error:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to create order'}`);
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

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'reports'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              📈 Reports
            </button>
            {isAuthenticated && (
              <button
                onClick={() => setActiveTab('expenses')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'expenses'
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                💸 Expenses
              </button>
            )}
          </div>
        </div>

        {/* Reports Tab Content */}
        {activeTab === 'reports' && (
          <>
            {/* Daily Report */}
            <div className="mb-8">
              <DailyReportCard />
            </div>

            {/* Orders Report */}
            <div className="mb-8">
              <OrdersReportCard />
            </div>
          </>
        )}

        {/* Expenses Tab Content */}
        {activeTab === 'expenses' && isAuthenticated && (
          <>
            {/* Add/Edit Expense Form */}
            <Card className="mb-8">
              <h2 className="text-2xl font-bold mb-6">
                {editingExpense ? '✏️ Edit Expense' : '💸 Record New Expense'}
              </h2>
              <form onSubmit={editingExpense ? handleUpdateExpense : handleCreateExpense} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      defaultValue={editingExpense ? new Date(editingExpense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Amount (USD)</label>
                    <input
                      type="number"
                      name="amount_usd"
                      step="0.01"
                      min="0.01"
                      defaultValue={editingExpense ? parseFloat(editingExpense.amount_usd as any) : undefined}
                      placeholder="0.00"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    name="description"
                    rows={3}
                    defaultValue={editingExpense ? editingExpense.description : ''}
                    placeholder="What was this expense for?"
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="submit" variant="primary" fullWidth>
                    {editingExpense ? '💾 Update Expense' : '💾 Save Expense'}
                  </Button>
                  {editingExpense && (
                    <Button type="button" variant="secondary" onClick={() => setEditingExpense(null)}>
                      ❌ Cancel
                    </Button>
                  )}
                </div>
              </form>
            </Card>

            {/* Expenses List */}
            <Card>
              <h2 className="text-2xl font-bold mb-6">📋 Expense History</h2>
              {!expenses || expenses.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No expenses recorded yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-[#151932] rounded-lg p-5 border-l-4 border-red-500"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-xl font-bold text-red-400">
                            ${parseFloat(expense.amount_usd as any).toFixed(2)}
                          </p>
                          <p className="text-sm text-gray-400 mt-1">
                            {new Date(expense.date).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-white mt-2">{expense.description}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setEditingExpense(expense)}
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id, expense.description)}
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total Expenses Summary */}
              {expenses && expenses.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-300">Total Expenses:</span>
                    <span className="text-2xl font-bold text-red-400">
                      ${expenses.reduce((sum, exp) => sum + parseFloat(exp.amount_usd as any), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* Exchange Rate Management */}
            <div className="mb-8">
              <ExchangeRateManager />
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

            {/* Private Orders Section */}
            <Card className="bg-gradient-to-r from-purple-900/30 to-orange-900/30 border-2 border-purple-500/30 mt-6">
              <h3 className="text-2xl font-bold mb-6">🔒 My Private Orders</h3>
              <p className="text-sm text-gray-400 mb-6">
                Create your own VES and COP orders separately from Patty's orders
              </p>

              {/* Order Type Selector */}
              <div className="flex gap-3 mb-6">
                <Button
                  variant={privateOrderType === 'VES' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPrivateOrderType('VES')}
                >
                  VES Order 🇻🇪
                </Button>
                <Button
                  variant={privateOrderType === 'COP' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setPrivateOrderType('COP')}
                >
                  COP Order 🇨🇴
                </Button>
              </div>

              {/* Order Form */}
              <form onSubmit={handleCreatePrivateOrder} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                      required
                      placeholder="Customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {privateOrderType === 'VES' ? 'Amount (VES) *' : 'Amount (COP) *'}
                    </label>
                    <input
                      type="number"
                      name={privateOrderType === 'VES' ? 'amount_ves' : 'amount_cop'}
                      step="1"
                      min="1"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                      required
                      placeholder={privateOrderType === 'VES' ? 'e.g., 1000000' : 'e.g., 200000'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Bank
                    </label>
                    <input
                      type="text"
                      name="bank"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                      placeholder="Bank name (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="text"
                      name="phone_number"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                      placeholder="Phone (optional)"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Customer ID
                    </label>
                    <input
                      type="text"
                      name="customer_id"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                      placeholder="ID number (optional)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      name="account_number"
                      className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                      placeholder="Account (optional)"
                    />
                  </div>
                </div>

                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-sm text-purple-300">
                    💡 <strong>Private Orders:</strong>{' '}
                    {privateOrderType === 'VES'
                      ? 'VES orders will be sent to Dairimar for fulfillment'
                      : 'COP orders will appear in your pending COP orders for you to fulfill'}
                  </p>
                </div>

                <Button
                  type="submit"
                  variant={privateOrderType === 'VES' ? 'primary' : 'success'}
                  fullWidth
                  size="lg"
                >
                  Create {privateOrderType} Order
                </Button>
              </form>
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

        {/* USDT Requests from Dairimar */}
        {usdtRequests.filter(r => r.status === 'PENDING').length > 0 && (
          <Card className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold">💸 USDT Requests from Dairimar</h3>
              <span className="bg-yellow-500/20 text-yellow-400 text-xs font-medium px-3 py-1 rounded-full">
                {usdtRequests.filter(r => r.status === 'PENDING').length} pending
              </span>
            </div>
            <div className="space-y-4">
              {usdtRequests
                .filter(r => r.status === 'PENDING')
                .map((request) => (
                  <div
                    key={request.id}
                    className="bg-[#151932] rounded-lg p-5 border-l-4 border-yellow-500"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-2xl font-bold text-yellow-400">
                          ${parseFloat(request.amount_usdt as any).toFixed(2)} USDT
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          Requested: {new Date(request.date_requested).toLocaleString()}
                        </p>
                        <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                          <p className="text-xs text-gray-400 mb-1">Reason:</p>
                          <p className="text-sm text-white">{request.reason}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => {
                          const notes = prompt('Optional notes for approval:');
                          if (notes !== null) {
                            handleApproveUSDTRequest(request.id, notes || undefined);
                          }
                        }}
                      >
                        ✅ Approve & Transfer
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setShowRejectForm(request.id)}
                      >
                        ❌ Reject
                      </Button>
                    </div>

                    {showRejectForm === request.id && (
                      <form
                        onSubmit={(e) => handleRejectUSDTRequest(request.id, e)}
                        className="mt-4 pt-4 border-t border-gray-700"
                      >
                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              Rejection Reason (Required)
                            </label>
                            <textarea
                              name="notes"
                              rows={3}
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                              required
                              placeholder="Explain why this request is being rejected..."
                            />
                            <p className="mt-1 text-xs text-gray-500">
                              Minimum 5 characters required
                            </p>
                          </div>
                          <div className="flex space-x-2">
                            <Button type="submit" variant="danger" fullWidth size="sm">
                              Confirm Rejection
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              fullWidth
                              size="sm"
                              onClick={() => setShowRejectForm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                ))}
            </div>
          </Card>
        )}

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
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowEditForm({ id: order.id, type: 'VES' })}
                        >
                          ✏️ Edit
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id, 'VES', order.customer_name)}
                        >
                          ❌ Cancel
                        </Button>
                      </div>
                      {showEditForm?.id === order.id && showEditForm.type === 'VES' && (
                        <form
                          onSubmit={(e) => handleEditOrder(order.id, 'VES', e)}
                          className="mt-4 pt-4 border-t border-gray-700 space-y-3"
                        >
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
                              <input
                                type="text"
                                name="customer_name"
                                defaultValue={order.customer_name}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Amount (VES)</label>
                              <input
                                type="number"
                                name="amount_ves"
                                defaultValue={order.amount_ves}
                                step="1"
                                min="1"
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Bank</label>
                              <input
                                type="text"
                                name="bank"
                                defaultValue={order.bank || ''}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                              <input
                                type="text"
                                name="phone_number"
                                defaultValue={order.phone_number || ''}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Customer ID</label>
                              <input
                                type="text"
                                name="customer_id"
                                defaultValue={order.customer_id || ''}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Account</label>
                              <input
                                type="text"
                                name="account_number"
                                defaultValue={order.account_number || ''}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                              />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="submit" variant="success" fullWidth size="sm">
                              Save Changes
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              fullWidth
                              size="sm"
                              onClick={() => setShowEditForm(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}
                    </div>
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
                      <div className="flex gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowFulfillForm(order.id)}
                        >
                          Fulfill
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setShowEditForm({ id: order.id, type: 'COP' })}
                        >
                          ✏️
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleCancelOrder(order.id, 'COP', order.customer_name)}
                        >
                          ❌
                        </Button>
                      </div>
                    </div>

                    {showEditForm?.id === order.id && showEditForm.type === 'COP' && (
                      <form
                        onSubmit={(e) => handleEditOrder(order.id, 'COP', e)}
                        className="mt-4 pt-4 border-t border-gray-700 space-y-3"
                      >
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
                            <input
                              type="text"
                              name="customer_name"
                              defaultValue={order.customer_name}
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Amount (COP)</label>
                            <input
                              type="number"
                              name="amount_cop"
                              defaultValue={order.amount_cop}
                              step="1"
                              min="1"
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                              required
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Bank</label>
                            <input
                              type="text"
                              name="bank"
                              defaultValue={order.bank || ''}
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                            <input
                              type="text"
                              name="phone_number"
                              defaultValue={order.phone_number || ''}
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Customer ID</label>
                            <input
                              type="text"
                              name="customer_id"
                              defaultValue={order.customer_id || ''}
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Account</label>
                            <input
                              type="text"
                              name="account_number"
                              defaultValue={order.account_number || ''}
                              className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-3 py-2 text-sm"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button type="submit" variant="success" fullWidth size="sm">
                            Save Changes
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            fullWidth
                            size="sm"
                            onClick={() => setShowEditForm(null)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    )}

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

        {/* USDT Request History */}
        {usdtRequests.length > 0 && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold mb-4">📋 USDT Request History</h3>
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
                      Reason
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                      Resolved
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">
                      Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {usdtRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="px-4 py-3 text-sm text-gray-300">
                        {new Date(request.date_requested).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-yellow-400">
                        ${parseFloat(request.amount_usdt as any).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                        {request.reason}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            request.status === 'PENDING'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : request.status === 'FULFILLED'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-red-500/20 text-red-400'
                          }`}
                        >
                          {request.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400">
                        {request.date_resolved
                          ? new Date(request.date_resolved).toLocaleDateString()
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-400 max-w-xs truncate">
                        {request.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
          </>
        )}

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
