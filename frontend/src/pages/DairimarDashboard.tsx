import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { PushNotificationService } from '../services/pushNotificationService';
import DailyReportCard from '../components/DailyReportCard';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import { Card, StatCard, Button } from '../components/modern';
import type { Balances, VESOrder, VESShortfall, Conversion, ExchangeRate, USDTRequest } from '../types';

export default function DairimarDashboard() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [shortfall, setShortfall] = useState<VESShortfall | null>(null);
  const [pendingOrders, setPendingOrders] = useState<VESOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<VESOrder[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [usdtRequests, setUsdtRequests] = useState<USDTRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [showUSDTRequestForm, setShowUSDTRequestForm] = useState(false);
  const [showFulfillForm, setShowFulfillForm] = useState<number | null>(null);
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);
  const [mainTab, setMainTab] = useState<'dashboard' | 'reports'>('dashboard');

  useEffect(() => {
    loadData();

    // Initialize push notifications (mobile only)
    PushNotificationService.initialize('dairimar');

    // Refresh pending orders and balances every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000);

    // Cleanup on unmount
    return () => {
      PushNotificationService.unregister();
      clearInterval(refreshInterval);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'completed') {
      loadCompletedOrders();
    }
  }, [activeTab, completedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balancesRes, shortfallRes, ordersRes, conversionsRes, rateRes, requestsRes] = await Promise.all([
        api.getBalances(),
        api.getVESShortfall(),
        api.getVESOrders('PENDING'),
        api.getConversions(),
        api.getCurrentRate('VES'),
        api.getUSDTRequests()
      ]);

      console.log('📊 API Response - Balances:', balancesRes.data);
      console.log('📊 Pending Orders:', ordersRes.data);
      console.log('📊 Current VES Rate:', rateRes.data);
      console.log('📊 USDT Requests:', requestsRes.data);

      setBalances(balancesRes.data);
      setShortfall(shortfallRes.data);
      setPendingOrders(ordersRes.data);
      setConversions(conversionsRes.data);
      setCurrentRate(rateRes.data);
      setUsdtRequests(requestsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCompletedOrders = async () => {
    try {
      const response = await api.getVESOrders('COMPLETED');
      // Filter by selected date
      const filtered = response.data.filter(order => {
        if (!order.date_completed) return false;
        const orderDate = new Date(order.date_completed).toISOString().split('T')[0];
        return orderDate === completedDate;
      });
      setCompletedOrders(filtered);
    } catch (error) {
      console.error('Error loading completed orders:', error);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: text });
        alert(`✓ ${label} copied!`);
      } else {
        await navigator.clipboard.writeText(text);
        alert(`✓ ${label} copied!`);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  const handleConvert = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const usdt_amount = parseFloat(formData.get('usdt_amount') as string);
    const exchange_rate = parseFloat(formData.get('exchange_rate') as string);

    try {
      await api.createConversion({ usdt_amount, exchange_rate });
      alert('✅ Conversion successful!');
      setShowConvertForm(false);
      loadData();
    } catch (error: any) {
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to convert'}`);
    }
  };

  const handleUSDTRequest = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget; // Save reference before async operations
    const formData = new FormData(form);
    const amount_usdt = parseFloat(formData.get('amount_usdt') as string);
    const reason = (formData.get('reason') as string).trim();

    // Frontend validation
    if (!reason || reason.length < 5) {
      alert('❌ Reason must be at least 5 characters long');
      return;
    }

    if (!amount_usdt || amount_usdt <= 0) {
      alert('❌ Amount must be greater than 0');
      return;
    }

    try {
      await api.createUSDTRequest({ amount_usdt, reason });

      alert(`✅ USDT Request submitted successfully!\n\nAmount: ${amount_usdt.toFixed(2)} USDT\nReason: ${reason}`);
      setShowUSDTRequestForm(false);
      form.reset(); // Use saved reference
      loadData();
    } catch (error: any) {
      console.error('USDT Request Error:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to submit request';
      alert(`❌ Error: ${errorMessage}`);
    }
  };

  const handleFulfillOrder = async (orderId: number, e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();

    let exchange_rate: number | undefined = undefined;

    if (useCustomRate && e) {
      const formData = new FormData(e.currentTarget);
      exchange_rate = parseFloat(formData.get('exchange_rate') as string);

      if (!exchange_rate || exchange_rate <= 0) {
        alert('Please enter a valid exchange rate');
        return;
      }
    }

    try {
      const response = await api.fulfillVESOrder(orderId, { exchange_rate });
      console.log('✅ Order fulfilled:', response.data);

      alert('✅ Order fulfilled successfully!');
      setShowFulfillForm(null);
      setUseCustomRate(false);
      await loadData();
      console.log('📊 Data reloaded after fulfillment');
    } catch (error: any) {
      console.error('❌ Error fulfilling order:', error);
      alert(`❌ Error: ${error.response?.data?.error || 'Failed to fulfill order'}`);
    }
  };

  const getSuggestedConversion = () => {
    if (!shortfall || shortfall.shortfall <= 0) return 0;
    const rate = currentRate?.rate || 40000;
    return Math.ceil(shortfall.shortfall / rate);
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      PENDING: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      FULFILLED: 'bg-green-500/20 text-green-400 border border-green-500/30',
      REJECTED: 'bg-red-500/20 text-red-400 border border-red-500/30'
    };
    return styles[status as keyof typeof styles] || styles.PENDING;
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
      <header className="bg-gradient-to-r from-purple-600 to-purple-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-white">Good Morning, Dairimar! 👋</h1>
              <p className="text-purple-100 mt-1">Manage VES operations and orders</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={loadData}
                variant="ghost"
                size="sm"
                disabled={loading}
              >
                🔄 {loading ? 'Refreshing...' : 'Refresh'}
              </Button>
              {/* Push notifications are sent from server, no test button needed */}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setMainTab('dashboard')}
              className={`px-6 py-3 font-medium transition-colors ${
                mainTab === 'dashboard'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              📊 Dashboard
            </button>
            <button
              onClick={() => setMainTab('reports')}
              className={`px-6 py-3 font-medium transition-colors ${
                mainTab === 'reports'
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              📈 Reports
            </button>
          </div>
        </div>

        {/* Reports Tab Content */}
        {mainTab === 'reports' && (
          <>
            {/* Daily Report */}
            <div className="mb-8">
              <DailyReportCard />
            </div>
          </>
        )}

        {/* Dashboard Tab Content */}
        {mainTab === 'dashboard' && (
          <>
            {/* Current VES Rate Display */}
            {currentRate && (
          <Card className="bg-gradient-to-r from-purple-600 to-purple-700 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-purple-100">Current VES Rate</p>
                <p className="text-4xl font-bold text-white mt-1">
                  {Number(currentRate.rate).toLocaleString()} <span className="text-xl">VES/USDT</span>
                </p>
                <p className="text-xs text-purple-200 mt-2">
                  Set by {currentRate.set_by} at {new Date(currentRate.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-purple-100">One-Click Fulfill</p>
                <p className="text-lg text-white">Just press "Fulfill Order" ✨</p>
              </div>
            </div>
          </Card>
        )}

        {!currentRate && (
          <Card className="bg-yellow-900/30 border-2 border-yellow-500/50 mb-6">
            <p className="text-yellow-300 font-semibold">⚠️ No VES rate set</p>
            <p className="text-yellow-200 text-sm mt-1">
              Contact Brian to set the current VES rate before fulfilling orders.
            </p>
          </Card>
        )}

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatCard
            title="My USDT Balance"
            value={balances ? parseFloat(String(balances.dai_usdt)).toFixed(2) : '0.00'}
            subtitle="Available to convert"
            color="success"
            icon={<span className="text-5xl">💵</span>}
          />
          <StatCard
            title="My VES Balance"
            value={balances ? parseFloat(String(balances.dai_ves)).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
            subtitle="Available to fulfill orders"
            color="primary"
            icon={<span className="text-5xl">🇻🇪</span>}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Button
            onClick={() => setShowConvertForm(true)}
            variant="primary"
            fullWidth
            icon={<>💱</>}
          >
            Convert USDT to VES
          </Button>
          <Button
            onClick={() => setShowUSDTRequestForm(true)}
            variant="success"
            fullWidth
            icon={<>📨</>}
          >
            Request USDT from Brian
          </Button>
        </div>

        {/* USDT Requests Section */}
        {usdtRequests.length > 0 && (
          <Card className="mb-8">
            <h3 className="text-xl font-bold mb-4">My USDT Requests</h3>
            <div className="space-y-3">
              {usdtRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-[#151932] rounded-lg p-4 border border-gray-700"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xl font-bold text-cyan-400">
                          {Number(request.amount_usdt).toFixed(2)} USDT
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(request.status)}`}>
                          {request.status}
                        </span>
                      </div>
                      <p className="text-gray-300 text-sm mb-1">{request.reason}</p>
                      <p className="text-gray-500 text-xs">
                        Requested: {new Date(request.date_requested).toLocaleDateString()}
                      </p>
                      {request.date_resolved && (
                        <p className="text-gray-500 text-xs">
                          Resolved: {new Date(request.date_resolved).toLocaleDateString()}
                        </p>
                      )}
                      {request.notes && (
                        <p className="text-gray-400 text-sm mt-2 italic">
                          Note: {request.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Pending Orders Alert */}
        {shortfall && (
          <Card className={`mb-8 ${
            shortfall.is_sufficient
              ? 'bg-green-900/20 border-2 border-green-500/50'
              : 'bg-red-900/20 border-2 border-red-500/50'
          }`}>
            <h2 className="text-2xl font-bold mb-4">
              {shortfall.is_sufficient ? '✅ PENDING ORDERS OVERVIEW' : '⚠️ PENDING ORDERS OVERVIEW'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-400">Pending Orders</p>
                <p className="text-3xl font-bold text-white">{pendingOrders.length} orders</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Total VES Needed</p>
                <p className="text-3xl font-bold text-purple-400">
                  {Number(shortfall.pending_total || 0).toLocaleString()} VES
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Your VES Balance</p>
                <p className="text-3xl font-bold text-cyan-400">
                  {Number(shortfall.current_balance || 0).toLocaleString()} VES
                </p>
              </div>
            </div>

            {shortfall.is_sufficient ? (
              <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
                <p className="text-green-300 font-semibold">
                  ✓ Sufficient balance to fulfill all orders
                </p>
              </div>
            ) : (
              <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30">
                <p className="text-red-300 font-bold mb-2">
                  ❌ SHORTFALL: {Number(Math.abs(shortfall.shortfall || 0)).toLocaleString()} VES
                </p>
                <p className="text-red-200">
                  💡 Suggestion: Convert ~{getSuggestedConversion()} USDT at {currentRate ? Number(currentRate.rate).toLocaleString() : '40,000'} rate
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Convert Form Modal */}
        {showConvertForm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-2xl font-bold mb-6">Convert USDT to VES 💱</h3>
              <form onSubmit={handleConvert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">USDT Amount</label>
                  <input
                    type="number"
                    name="usdt_amount"
                    step="0.01"
                    max={balances?.dai_usdt}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    Available: {balances ? Number(balances.dai_usdt || 0).toFixed(2) : '0.00'} USDT
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Exchange Rate (VES/USDT)</label>
                  <input
                    type="number"
                    name="exchange_rate"
                    step="0.01"
                    defaultValue={currentRate?.rate || ''}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                    required
                  />
                  {currentRate && (
                    <p className="text-xs text-gray-500 mt-2">
                      Current rate: {Number(currentRate.rate).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" fullWidth>
                    Convert
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowConvertForm(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* USDT Request Form Modal */}
        {showUSDTRequestForm && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <h3 className="text-2xl font-bold mb-6">Request USDT from Brian 📨</h3>
              <form onSubmit={handleUSDTRequest} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">USDT Amount</label>
                  <input
                    type="number"
                    name="amount_usdt"
                    step="0.01"
                    min="0.01"
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reason for Request</label>
                  <textarea
                    name="reason"
                    rows={3}
                    minLength={5}
                    className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                    placeholder="Why do you need this USDT? (minimum 5 characters)"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum 5 characters required</p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="success" fullWidth>
                    Submit Request
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setShowUSDTRequestForm(false)}
                    variant="secondary"
                    fullWidth
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Orders Tabs */}
        <Card className="mb-8 p-0">
          <div className="border-b border-gray-700">
            <div className="flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-cyan-500 text-cyan-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Pending Orders ({pendingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-6 py-4 font-semibold transition-colors ${
                  activeTab === 'completed'
                    ? 'border-b-2 border-cyan-500 text-cyan-400'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Completed Orders
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Pending VES Orders Queue</h3>
                  <span className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium border border-yellow-500/30">
                    Showing: PENDING Only
                  </span>
                </div>
                <div className="space-y-4">
                  {pendingOrders.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No pending orders</p>
                  ) : (
                    pendingOrders
                      .filter(order => order.status === 'PENDING')
                      .map((order) => (
                        <div key={order.id} className="bg-[#151932] border border-gray-700 rounded-lg p-5">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-bold text-xl text-white mb-1">{order.customer_name}</p>
                              <p className="text-purple-400 text-lg font-semibold">
                                {Number(order.amount_ves || 0).toLocaleString()} VES
                              </p>
                              {currentRate && (
                                <p className="text-sm text-green-400 font-semibold mt-2">
                                  → Will sell: {(order.amount_ves / currentRate.rate).toFixed(2)} USDT
                                </p>
                              )}
                              <p className="text-sm text-gray-500 mt-1">
                                Submitted: {new Date(order.date_submitted).toLocaleDateString()}
                              </p>
                              {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                                <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
                                  <p className="font-medium text-gray-300 text-sm">Customer Payment Info:</p>
                                  {order.bank && (
                                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                      <span className="text-gray-300 text-sm">🏦 Bank: {order.bank}</span>
                                      <Button
                                        onClick={() => copyToClipboard(order.bank!, 'Bank')}
                                        variant="primary"
                                        size="sm"
                                      >
                                        Copy
                                      </Button>
                                    </div>
                                  )}
                                  {order.phone_number && (
                                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                      <span className="text-gray-300 text-sm">📱 Phone: {order.phone_number}</span>
                                      <Button
                                        onClick={() => copyToClipboard(order.phone_number!, 'Phone')}
                                        variant="primary"
                                        size="sm"
                                      >
                                        Copy
                                      </Button>
                                    </div>
                                  )}
                                  {order.customer_id && (
                                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                      <span className="text-gray-300 text-sm">🆔 ID: {order.customer_id}</span>
                                      <Button
                                        onClick={() => copyToClipboard(order.customer_id!, 'ID')}
                                        variant="primary"
                                        size="sm"
                                      >
                                        Copy
                                      </Button>
                                    </div>
                                  )}
                                  {order.account_number && (
                                    <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                      <span className="text-gray-300 text-sm">💳 Account: {order.account_number}</span>
                                      <Button
                                        onClick={() => copyToClipboard(order.account_number!, 'Account')}
                                        variant="primary"
                                        size="sm"
                                      >
                                        Copy
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              {showFulfillForm === order.id ? (
                                <form onSubmit={(e) => handleFulfillOrder(order.id, e)} className="space-y-3 min-w-[200px]">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`custom-rate-${order.id}`}
                                      checked={useCustomRate}
                                      onChange={(e) => setUseCustomRate(e.target.checked)}
                                      className="rounded"
                                    />
                                    <label htmlFor={`custom-rate-${order.id}`} className="text-sm text-gray-300">
                                      Use custom rate
                                    </label>
                                  </div>

                                  {useCustomRate && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-300 mb-1">
                                        Exchange Rate (VES/USDT)
                                      </label>
                                      <input
                                        type="number"
                                        name="exchange_rate"
                                        step="0.01"
                                        defaultValue={currentRate?.rate || ''}
                                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-cyan-500"
                                        required
                                      />
                                    </div>
                                  )}

                                  <div className="flex flex-col gap-2">
                                    <Button
                                      type="submit"
                                      variant="success"
                                      size="sm"
                                      fullWidth
                                    >
                                      ✓ Confirm Fulfill
                                    </Button>
                                    <Button
                                      type="button"
                                      onClick={() => {
                                        setShowFulfillForm(null);
                                        setUseCustomRate(false);
                                      }}
                                      variant="secondary"
                                      size="sm"
                                      fullWidth
                                    >
                                      Cancel
                                    </Button>
                                  </div>
                                </form>
                              ) : (
                                <Button
                                  onClick={() => setShowFulfillForm(order.id)}
                                  variant="success"
                                  disabled={!currentRate}
                                >
                                  Fulfill Order
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'completed' && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-2xl font-bold">Completed Orders</h3>
                  <input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-3">
                  {completedOrders.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No completed orders for this date</p>
                  ) : (
                    completedOrders.map((order) => (
                      <div key={order.id} className="border-l-4 border-green-500 bg-green-900/20 p-4 rounded">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-lg text-white">{order.customer_name}</p>
                            <p className="text-sm text-gray-300">
                              {Number(order.amount_ves || 0).toLocaleString()} VES
                            </p>
                            <p className="text-sm text-green-400 font-semibold mt-1">
                              Sold: {Number(order.usdt_sold || 0).toFixed(2)} USDT at rate {Number(order.exchange_rate || 0).toLocaleString()}
                            </p>

                            {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                              <div className="mt-3 pt-3 border-t border-green-700/50 space-y-2">
                                <p className="font-medium text-gray-300 text-sm">Customer Payment Info:</p>
                                {order.bank && (
                                  <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                                    <span className="text-gray-300 text-sm">🏦 Bank: {order.bank}</span>
                                    <Button
                                      onClick={() => copyToClipboard(order.bank!, 'Bank')}
                                      variant="primary"
                                      size="sm"
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                )}
                                {order.phone_number && (
                                  <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                                    <span className="text-gray-300 text-sm">📱 Phone: {order.phone_number}</span>
                                    <Button
                                      onClick={() => copyToClipboard(order.phone_number!, 'Phone')}
                                      variant="primary"
                                      size="sm"
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                )}
                                {order.customer_id && (
                                  <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                                    <span className="text-gray-300 text-sm">🆔 ID: {order.customer_id}</span>
                                    <Button
                                      onClick={() => copyToClipboard(order.customer_id!, 'ID')}
                                      variant="primary"
                                      size="sm"
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                )}
                                {order.account_number && (
                                  <div className="flex justify-between items-center bg-gray-800/30 p-2 rounded">
                                    <span className="text-gray-300 text-sm">💳 Account: {order.account_number}</span>
                                    <Button
                                      onClick={() => copyToClipboard(order.account_number!, 'Account')}
                                      variant="primary"
                                      size="sm"
                                    >
                                      Copy
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-400 ml-4">
                            <p>{new Date(order.date_completed!).toLocaleTimeString()}</p>
                            <p className="text-xs">{new Date(order.date_completed!).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Conversions */}
        <Card>
          <h3 className="text-2xl font-bold mb-6">Recent Conversions 💱</h3>
          <div className="space-y-3">
            {conversions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No conversions yet</p>
            ) : (
              conversions.slice(0, 5).map((conv) => (
                <div key={conv.id} className="border-l-4 border-cyan-500 bg-[#151932] pl-4 py-3 rounded">
                  <p className="text-sm font-semibold text-white">
                    {Number(conv.usdt_amount || 0).toFixed(2)} USDT → {Number(conv.ves_received || 0).toLocaleString()} VES
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Rate: {Number(conv.exchange_rate || 0).toLocaleString()} VES/USDT | {new Date(conv.date).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </Card>
          </>
        )}
      </main>
    </div>
  );
}
