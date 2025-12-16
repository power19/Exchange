import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { NotificationService } from '../services/notificationService';
import type { Balances, VESOrder, VESShortfall, Conversion } from '../types';

export default function DairimarDashboard() {
  const [balances, setBalances] = useState<Balances | null>(null);
  const [shortfall, setShortfall] = useState<VESShortfall | null>(null);
  const [pendingOrders, setPendingOrders] = useState<VESOrder[]>([]);
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConvertForm, setShowConvertForm] = useState(false);
  const [showFulfillForm, setShowFulfillForm] = useState<number | null>(null);

  useEffect(() => {
    loadData();

    // Initialize notifications (mobile only)
    NotificationService.initialize('dairimar');

    // Cleanup on unmount
    return () => {
      NotificationService.stopMonitoring();
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balancesRes, shortfallRes, ordersRes, conversionsRes] = await Promise.all([
        api.getBalances(),
        api.getVESShortfall(),
        api.getVESOrders('PENDING'),
        api.getConversions()
      ]);

      console.log('📊 API Response - Balances:', balancesRes.data);
      console.log('📊 Pending Orders:', ordersRes.data);
      console.log('📊 Number of pending orders:', ordersRes.data.length);

      setBalances(balancesRes.data);
      setShortfall(shortfallRes.data);
      setPendingOrders(ordersRes.data);
      setConversions(conversionsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
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

  const handleFulfillOrder = async (orderId: number, e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const exchange_rate = parseFloat(formData.get('exchange_rate') as string);

    try {
      const response = await api.fulfillVESOrder(orderId, { exchange_rate });
      console.log('✅ Order fulfilled:', response.data);
      alert('✅ Order fulfilled successfully!\n\nThe order has been marked as COMPLETED and removed from the pending queue.');
      setShowFulfillForm(null);
      await loadData(); // Reload to remove fulfilled order from list
      console.log('📊 Data reloaded after fulfillment');
    } catch (error: any) {
      console.error('❌ Error fulfilling order:', error);
      alert(`Error: ${error.response?.data?.error || 'Failed to fulfill order'}`);
    }
  };

  const getSuggestedConversion = () => {
    if (!shortfall || shortfall.shortfall <= 0) return 0;
    // Assume average rate of 40,000 VES/USDT for suggestion
    return Math.ceil(shortfall.shortfall / 40000);
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
            {/* Debug info */}
            {balances && (
              <p className="text-xs text-gray-400 mt-1">
                Raw: {String(balances.dai_ves)} | Parsed: {parseFloat(String(balances.dai_ves || 0))}
              </p>
            )}
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
                  💡 Suggestion: Convert ~{getSuggestedConversion()} USDT at 40,000 rate
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
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border"
                    required
                  />
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

        {/* Pending Orders Queue */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
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
                .filter(order => order.status === 'PENDING') // Extra safety filter
                .map((order) => (
                <div key={order.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-lg">{order.customer_name}</p>
                      <p className="text-gray-600">{Number(order.amount_ves || 0).toLocaleString()} VES</p>
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
                      className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                      Fulfill
                    </button>
                  </div>

                  {showFulfillForm === order.id && (
                    <form onSubmit={(e) => handleFulfillOrder(order.id, e)} className="mt-4 pt-4 border-t">
                      <div className="space-y-2">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Exchange Rate (VES/USDT)
                          </label>
                          <input
                            type="number"
                            name="exchange_rate"
                            step="0.01"
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2 border"
                            required
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
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
