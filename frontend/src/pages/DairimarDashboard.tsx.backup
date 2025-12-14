import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { NotificationService } from '../services/notificationService';
import DailyReportCard from '../components/DailyReportCard';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';
import type { Balances, VESOrder, VESShortfall, Conversion, ExchangeRate } from '../types';

export default function DairimarDashboard() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [shortfall, setShortfall] = useState<VESShortfall | null>(null);
  const [pendingOrders, setPendingOrders] = useState<VESOrder[]>([]);
  const [completedOrders, setCompletedOrders] = useState<VESOrder[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [currentRate, setCurrentRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [showFulfillForm, setShowFulfillForm] = useState<number | null>(null);
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [activeTab, setActiveTab] = useState<'pending' | 'completed'>('pending');
  const [completedDate, setCompletedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();

    // Initialize notifications (mobile only)
    NotificationService.initialize();

    // Cleanup on unmount
    return () => {
      NotificationService.stopMonitoring();
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
      const [balancesRes, shortfallRes, ordersRes, conversionsRes, rateRes] = await Promise.all([
        api.getBalances(),
        api.getVESShortfall(),
        api.getVESOrders('PENDING'),
        api.getConversions(),
        api.getCurrentRate('VES')
      ]);

      console.log('📊 API Response - Balances:', balancesRes.data);
      console.log('📊 Pending Orders:', ordersRes.data);
      console.log('📊 Current VES Rate:', rateRes.data);

      setBalances(balancesRes.data);
      setShortfall(shortfallRes.data);
      setPendingOrders(ordersRes.data);
      setConversions(conversionsRes.data);
      setCurrentRate(rateRes.data);
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
        // Use Capacitor Clipboard API on mobile
        await Clipboard.write({ string: text });
        alert(`✓ ${label} copied!`);
      } else {
        // Use Web Clipboard API on web
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
      alert('Conversion successful!');
      setShowConvertForm(false);
      loadData();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.error || 'Failed to convert'}`);
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
      alert(`Error: ${error.response?.data?.error || 'Failed to fulfill order'}`);
    }
  };

  const getSuggestedConversion = () => {
    if (!shortfall || shortfall.shortfall <= 0) return 0;
    const rate = currentRate?.rate || 40000;
    return Math.ceil(shortfall.shortfall / rate);
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
      <header className="bg-indigo-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">Dairimar's Dashboard</h1>
            <div className="flex gap-2">
              <button
                onClick={loadData}
                className="px-3 py-1 bg-white bg-opacity-20 text-white rounded text-sm hover:bg-opacity-30"
                disabled={loading}
              >
                🔄 {loading ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => NotificationService.showTestNotification()}
                className="px-3 py-1 bg-white bg-opacity-20 text-white rounded text-sm hover:bg-opacity-30"
              >
                🔔 Test
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current VES Rate Display */}
        {currentRate && (
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow p-4 mb-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-90">Current VES Rate</p>
                <p className="text-3xl font-bold">{Number(currentRate.rate).toLocaleString()} VES/USDT</p>
                <p className="text-xs opacity-75 mt-1">
                  Set by {currentRate.set_by} at {new Date(currentRate.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90">One-Click Fulfill</p>
                <p className="text-lg">Just press "Fulfill Order" ✨</p>
              </div>
            </div>
          </div>
        )}

        {!currentRate && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 font-semibold">⚠️ No VES rate set</p>
            <p className="text-yellow-700 text-sm">Contact Brian to set the current VES rate before fulfilling orders.</p>
          </div>
        )}

        {/* Daily Report */}
        <div className="mb-8">
          <DailyReportCard />
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">My USDT Balance</h3>
            <p className="text-3xl font-bold text-green-600">
              {balances && balances.dai_usdt !== undefined
                ? parseFloat(String(balances.dai_usdt)).toFixed(2)
                : '0.00'} USDT
            </p>
            <button
              onClick={() => setShowConvertForm(true)}
              className="mt-4 w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Convert to VES
            </button>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-2">My VES Balance</h3>
            <p className="text-3xl font-bold text-purple-600">
              {balances && balances.dai_ves !== undefined
                ? parseFloat(String(balances.dai_ves)).toLocaleString('en-US', { maximumFractionDigits: 0 })
                : '0'} VES
            </p>
          </div>
        </div>

        {/* Pending Orders Alert */}
        {shortfall && (
          <div className={`rounded-lg shadow p-6 mb-8 ${
            shortfall.is_sufficient ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'
          }`}>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {shortfall.is_sufficient ? '✅ PENDING ORDERS OVERVIEW' : '⚠️ PENDING ORDERS OVERVIEW'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-gray-600">Pending Orders</p>
                <p className="text-2xl font-bold">{pendingOrders.length} orders</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total VES Needed</p>
                <p className="text-2xl font-bold">{Number(shortfall.pending_total || 0).toLocaleString()} VES</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Your VES Balance</p>
                <p className="text-2xl font-bold">{Number(shortfall.current_balance || 0).toLocaleString()} VES</p>
              </div>
            </div>

            {shortfall.is_sufficient ? (
              <div className="bg-green-100 rounded p-4">
                <p className="text-green-800 font-semibold">
                  ✓ Sufficient balance to fulfill all orders
                </p>
              </div>
            ) : (
              <div className="bg-red-100 rounded p-4">
                <p className="text-red-800 font-bold mb-2">
                  ❌ SHORTFALL: {Number(Math.abs(shortfall.shortfall || 0)).toLocaleString()} VES
                </p>
                <p className="text-red-700">
                  💡 Suggestion: Convert ~{getSuggestedConversion()} USDT at {currentRate ? Number(currentRate.rate).toLocaleString() : '40,000'} rate
                </p>
              </div>
            )}
          </div>
        )}

        {/* Convert Form Modal */}
        {showConvertForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold mb-4">Convert USDT to VES</h3>
              <form onSubmit={handleConvert} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">USDT Amount</label>
                  <input
                    type="number"
                    name="usdt_amount"
                    step="0.01"
                    max={balances?.dai_usdt}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Available: {balances ? Number(balances.dai_usdt || 0).toFixed(2) : '0.00'} USDT
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Exchange Rate (VES/USDT)</label>
                  <input
                    type="number"
                    name="exchange_rate"
                    step="0.01"
                    defaultValue={currentRate?.rate || ''}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border"
                    required
                  />
                  {currentRate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Current rate: {Number(currentRate.rate).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Convert
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConvertForm(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Orders Tabs */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('pending')}
                className={`px-6 py-3 font-semibold ${
                  activeTab === 'pending'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending Orders ({pendingOrders.length})
              </button>
              <button
                onClick={() => setActiveTab('completed')}
                className={`px-6 py-3 font-semibold ${
                  activeTab === 'completed'
                    ? 'border-b-2 border-indigo-500 text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Completed Orders
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'pending' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Pending VES Orders Queue</h3>
                  <span className="text-sm px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full font-medium">
                    Showing: PENDING Only
                  </span>
                </div>
                <div className="space-y-4">
                  {pendingOrders.length === 0 ? (
                    <p className="text-gray-500">No pending orders</p>
                  ) : (
                    pendingOrders
                      .filter(order => order.status === 'PENDING')
                      .map((order) => (
                        <div key={order.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-bold text-lg">{order.customer_name}</p>
                              <p className="text-gray-600">{Number(order.amount_ves || 0).toLocaleString()} VES</p>
                              {currentRate && (
                                <p className="text-sm text-green-600 font-semibold mt-1">
                                  → Will sell: {(order.amount_ves / currentRate.rate).toFixed(2)} USDT
                                </p>
                              )}
                              <p className="text-sm text-gray-500">
                                Submitted: {new Date(order.date_submitted).toLocaleDateString()}
                              </p>
                              {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                                <div className="mt-2 pt-2 border-t text-sm space-y-2">
                                  <p className="font-medium text-gray-700">Customer Payment Info:</p>
                                  {order.bank && (
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                      <span className="text-gray-600">🏦 Bank: {order.bank}</span>
                                      <button
                                        onClick={() => copyToClipboard(order.bank!, 'Bank')}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                  )}
                                  {order.phone_number && (
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                      <span className="text-gray-600">📱 Phone: {order.phone_number}</span>
                                      <button
                                        onClick={() => copyToClipboard(order.phone_number!, 'Phone')}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                  )}
                                  {order.customer_id && (
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                      <span className="text-gray-600">🆔 ID: {order.customer_id}</span>
                                      <button
                                        onClick={() => copyToClipboard(order.customer_id!, 'ID')}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                  )}
                                  {order.account_number && (
                                    <div className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                      <span className="text-gray-600">💳 Account: {order.account_number}</span>
                                      <button
                                        onClick={() => copyToClipboard(order.account_number!, 'Account')}
                                        className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                      >
                                        Copy
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              {showFulfillForm === order.id ? (
                                <form onSubmit={(e) => handleFulfillOrder(order.id, e)} className="space-y-2">
                                  <div className="flex items-center gap-2 mb-2">
                                    <input
                                      type="checkbox"
                                      id={`custom-rate-${order.id}`}
                                      checked={useCustomRate}
                                      onChange={(e) => setUseCustomRate(e.target.checked)}
                                      className="rounded"
                                    />
                                    <label htmlFor={`custom-rate-${order.id}`} className="text-sm text-gray-600">
                                      Use custom rate
                                    </label>
                                  </div>

                                  {useCustomRate && (
                                    <div>
                                      <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Exchange Rate (VES/USDT)
                                      </label>
                                      <input
                                        type="number"
                                        name="exchange_rate"
                                        step="0.01"
                                        defaultValue={currentRate?.rate || ''}
                                        className="w-full px-2 py-1 border rounded text-sm"
                                        required
                                      />
                                    </div>
                                  )}

                                  <div className="flex flex-col gap-2">
                                    <button
                                      type="submit"
                                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm font-semibold"
                                    >
                                      ✓ Confirm Fulfill
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setShowFulfillForm(null);
                                        setUseCustomRate(false);
                                      }}
                                      className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </form>
                              ) : (
                                <button
                                  onClick={() => setShowFulfillForm(order.id)}
                                  className="px-6 py-3 bg-green-500 text-white rounded hover:bg-green-600 font-semibold"
                                  disabled={!currentRate}
                                >
                                  Fulfill Order
                                </button>
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
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-gray-800">Completed Orders</h3>
                  <input
                    type="date"
                    value={completedDate}
                    onChange={(e) => setCompletedDate(e.target.value)}
                    className="px-3 py-1 border rounded text-sm"
                  />
                </div>
                <div className="space-y-3">
                  {completedOrders.length === 0 ? (
                    <p className="text-gray-500">No completed orders for this date</p>
                  ) : (
                    completedOrders.map((order) => (
                      <div key={order.id} className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
                        <div className="flex justify-between">
                          <div className="flex-1">
                            <p className="font-bold">{order.customer_name}</p>
                            <p className="text-sm text-gray-600">
                              {Number(order.amount_ves || 0).toLocaleString()} VES
                            </p>
                            <p className="text-sm text-green-700 font-semibold">
                              Sold: {Number(order.usdt_sold || 0).toFixed(2)} USDT at rate {Number(order.exchange_rate || 0).toLocaleString()}
                            </p>

                            {/* Customer Payment Info */}
                            {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                              <div className="mt-2 pt-2 border-t border-green-300 text-sm space-y-2">
                                <p className="font-medium text-gray-700">Customer Payment Info:</p>
                                {order.bank && (
                                  <div className="flex justify-between items-center bg-white p-2 rounded">
                                    <span className="text-gray-600">🏦 Bank: {order.bank}</span>
                                    <button
                                      onClick={() => copyToClipboard(order.bank!, 'Bank')}
                                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                )}
                                {order.phone_number && (
                                  <div className="flex justify-between items-center bg-white p-2 rounded">
                                    <span className="text-gray-600">📱 Phone: {order.phone_number}</span>
                                    <button
                                      onClick={() => copyToClipboard(order.phone_number!, 'Phone')}
                                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                )}
                                {order.customer_id && (
                                  <div className="flex justify-between items-center bg-white p-2 rounded">
                                    <span className="text-gray-600">🆔 ID: {order.customer_id}</span>
                                    <button
                                      onClick={() => copyToClipboard(order.customer_id!, 'ID')}
                                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                )}
                                {order.account_number && (
                                  <div className="flex justify-between items-center bg-white p-2 rounded">
                                    <span className="text-gray-600">💳 Account: {order.account_number}</span>
                                    <button
                                      onClick={() => copyToClipboard(order.account_number!, 'Account')}
                                      className="px-2 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm text-gray-500 ml-4">
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
        </div>

        {/* Recent Conversions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Conversions</h3>
          <div className="space-y-2">
            {conversions.length === 0 ? (
              <p className="text-gray-500">No conversions yet</p>
            ) : (
              conversions.slice(0, 5).map((conv) => (
                <div key={conv.id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="text-sm font-semibold">
                    {Number(conv.usdt_amount || 0).toFixed(2)} USDT → {Number(conv.ves_received || 0).toLocaleString()} VES
                  </p>
                  <p className="text-xs text-gray-500">
                    Rate: {Number(conv.exchange_rate || 0).toLocaleString()} VES/USDT | {new Date(conv.date).toLocaleDateString()}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
