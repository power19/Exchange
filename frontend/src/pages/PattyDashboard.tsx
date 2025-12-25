import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { PushNotificationService } from '../services/pushNotificationService';
import { Card, StatCard, Button } from '../components/modern';
import { useToast } from '../components/Toast';
import OrdersReportCard from '../components/OrdersReportCard';
import { getTodayDateString } from '../utils/dateUtils';
import type { Balances, VESOrder, COPOrder, DailyReport } from '../types';

// Venezuelan bank codes mapping
const BANK_CODES: Record<string, string> = {
  '0102': 'Banco de Venezuela',
  '0104': 'Banco Venezolano de Crédito',
  '0105': 'Mercantil',
  '0108': 'Banco Provincial (BBVA)',
  '0114': 'Bancaribe',
  '0115': 'Banco Exterior',
  '0128': 'Banco Caroní',
  '0134': 'Banesco',
  '0137': 'Banco Sofitasa',
  '0138': 'Banco Plaza',
  '0151': 'BFC Banco Fondo Común',
  '0156': '100% Banco',
  '0163': 'Banco del Tesoro',
  '0169': 'Mi Banco',
  '0171': 'Banco Activo',
  '0172': 'Bancamiga',
  '0174': 'Banplus',
  '0175': 'Banco Bicentenario',
  '0177': 'BANFANB',
  '0191': 'Banco Nacional de Crédito (BNC)',
  '0601': 'Instituto Municipal de Crédito Popular',
};

// Bank list for Venezuela and Colombia
const BANKS = [
  // Venezuelan Banks
  'Banesco', 'Mercantil', 'Banco de Venezuela', 'Banco Provincial (BBVA)',
  'Banco Bicentenario', 'Banco Exterior', 'Bancaribe', 'Banco del Tesoro',
  'Banco Activo', 'BOD (Banco Occidental de Descuento)', 'Banplus',
  'Banco Sofitasa', 'Mi Banco', 'Banco Plaza', 'Banco Nacional de Crédito (BNC)',
  // Colombian Banks
  'Bancolombia', 'Banco de Bogotá', 'Davivienda', 'BBVA Colombia',
  'Banco de Occidente', 'Banco Popular', 'Itaú', 'Scotiabank Colpatria',
  'Banco Caja Social', 'AV Villas', 'Bancoomeva', 'Banco Agrario', 'Nequi', 'Daviplata'
].sort();

export default function PattyDashboard() {
  const toast = useToast();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [myOrders, setMyOrders] = useState<{ves: VESOrder[], cop: COPOrder[]}>({ves: [], cop: []});
  const [orderType, setOrderType] = useState<'VES' | 'COP'>('VES');
  const [loading, setLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState<DailyReport | null>(null);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);

  // Form fields state for auto-fill
  const [formData, setFormData] = useState({
    bank: '',
    customer_id: '',
    phone_number: ''
  });

  const [pasteValue, setPasteValue] = useState('');
  const [showEditForm, setShowEditForm] = useState<{ id: number; type: 'VES' | 'COP' } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports'>('dashboard');

  useEffect(() => {
    loadData();

    // Initialize push notifications (mobile only)
    PushNotificationService.initialize('patty');

    // Refresh orders and balances every 30 seconds
    const refreshInterval = setInterval(() => {
      loadData();
    }, 30000);

    // Cleanup on unmount
    return () => {
      PushNotificationService.unregister();
      clearInterval(refreshInterval);
    };
  }, []);

  const loadData = async () => {
    try {
      console.log('📥 Loading data...');
      const today = getTodayDateString();

      // Load critical data first
      const [balancesRes, vesOrdersRes, copOrdersRes] = await Promise.all([
        api.getBalances(),
        api.getVESOrders(),
        api.getCOPOrders()
      ]);

      console.log('📊 Balances:', balancesRes.data);
      console.log('💜 VES Orders:', vesOrdersRes.data.length, 'orders');
      console.log('🧡 COP Orders:', copOrdersRes.data.length, 'orders');

      setBalances(balancesRes.data);
      setMyOrders({
        ves: vesOrdersRes.data,
        cop: copOrdersRes.data
      });

      // Load reports separately - don't fail if these endpoints error
      try {
        const [reportRes, ordersRes] = await Promise.all([
          api.getDailyReport(),
          api.getOrdersReport(today, today)
        ]);
        console.log('📈 Daily Report:', reportRes.data);
        console.log('✅ Completed Orders:', ordersRes.data);
        setDailyReport(reportRes.data);
        setCompletedOrders(ordersRes.data);
      } catch (reportError) {
        console.warn('⚠️ Failed to load reports (non-critical):', reportError);
        // Reports are optional, continue without them
      }

      console.log('✅ Data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading data:', error);
      toast.error('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPaste = (value: string) => {
    setPasteValue(value);

    // Remove any spaces or special characters
    const cleaned = value.replace(/\s+/g, '');

    // Expected format: 4 digits bank code + 8 digits ID + 11 digits phone (total 23)
    if (cleaned.length === 23 && /^\d+$/.test(cleaned)) {
      const bankCode = cleaned.substring(0, 4);
      const idNumber = cleaned.substring(4, 12);
      const phoneNumber = cleaned.substring(12, 23);

      const bankName = BANK_CODES[bankCode] || '';

      setFormData({
        bank: bankName,
        customer_id: idNumber,
        phone_number: phoneNumber
      });

      toast.success(`Auto-filled!\nBank: ${bankName || 'Unknown code: ' + bankCode}\nID: ${idNumber}\nPhone: ${phoneNumber}`);
    } else if (cleaned.length > 0) {
      toast.warning(`Invalid format. Expected 23 digits.\nReceived: ${cleaned.length} characters`);
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Store form reference before async operations
    const form = e.currentTarget;
    const formData = new FormData(form);
    const customer_name = formData.get('customer_name') as string;
    const amount = parseFloat(formData.get('amount') as string);

    // Get new optional fields (filter out empty strings)
    const bank = (formData.get('bank') as string)?.trim() || undefined;
    const phone_number = (formData.get('phone_number') as string)?.trim() || undefined;
    const customer_id = (formData.get('customer_id') as string)?.trim() || undefined;
    const account_number = (formData.get('account_number') as string)?.trim() || undefined;

    try {
      if (orderType === 'VES') {
        const response = await api.createVESOrder({
          customer_name,
          amount_ves: amount,
          ...(bank && { bank }),
          ...(phone_number && { phone_number }),
          ...(customer_id && { customer_id }),
          ...(account_number && { account_number })
        });
        console.log('VES Order Response:', response);
      } else {
        const response = await api.createCOPOrder({
          customer_name,
          amount_cop: amount,
          ...(bank && { bank }),
          ...(phone_number && { phone_number }),
          ...(customer_id && { customer_id }),
          ...(account_number && { account_number })
        });
        console.log('COP Order Response:', response);
      }

      // Reset form using stored reference
      form.reset();
      setFormData({ bank: '', customer_id: '', phone_number: '' });
      setPasteValue('');

      // Reload data to show new order
      await loadData();

      toast.success('Order submitted successfully!');
    } catch (error: any) {
      console.error('Order submission error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit order';
      toast.error(errorMsg);
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

      toast.success('Order cancelled successfully!');
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel order');
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

      toast.success('Order updated successfully!');
      setShowEditForm(null);
      await loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update order');
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
      <header className="bg-gradient-to-r from-pink-600 to-pink-700 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Good Morning, Patty! 👋</h1>
            <p className="text-pink-100 mt-1">Submit customer orders</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          </div>
        </div>

        {/* Reports Tab Content */}
        {activeTab === 'reports' && (
          <>
            {/* Daily Report */}
            {dailyReport && (
          <Card className="bg-gradient-to-r from-pink-600 to-purple-600 mb-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Today's Report - {dailyReport.date}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-white/90">VES Orders</p>
                <p className="text-3xl font-bold text-white">{dailyReport.ves_orders.count}</p>
                <p className="text-xs text-white/80">{dailyReport.ves_orders.total_usdt.toFixed(2)} USDT</p>
              </div>

              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-white/90">COP Orders</p>
                <p className="text-3xl font-bold text-white">{dailyReport.cop_orders.count}</p>
                <p className="text-xs text-white/80">{dailyReport.cop_orders.total_usdt.toFixed(2)} USDT</p>
              </div>

              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-white/90">Total Orders</p>
                <p className="text-3xl font-bold text-white">{dailyReport.ves_orders.count + dailyReport.cop_orders.count}</p>
              </div>

              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm text-white/90">Total USDT Sold</p>
                <p className="text-3xl font-bold text-white">{dailyReport.total_usdt_sold.toFixed(2)}</p>
              </div>
            </div>

            {/* Completed Orders Today */}
            {completedOrders.length > 0 && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
                <h3 className="text-lg font-semibold text-white mb-4">Completed Orders Today ({completedOrders.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {completedOrders.map((order: any, idx: number) => (
                    <div key={idx} className="bg-white/10 rounded-lg p-4 flex justify-between items-center border border-white/10">
                      <div>
                        <p className="font-semibold text-white">{order.customer_name}</p>
                        <p className="text-sm text-white/80">
                          {order.order_type === 'VES'
                            ? `${parseFloat(order.amount).toLocaleString()} VES`
                            : `${parseFloat(order.amount).toLocaleString()} COP`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-green-400">{parseFloat(order.usdt_sold).toFixed(2)} USDT</p>
                        <p className="text-xs text-white/70">
                          Rate: {parseFloat(order.exchange_rate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

            {/* Orders Report */}
            <OrdersReportCard />
          </>
        )}

        {/* Dashboard Tab Content */}
        {activeTab === 'dashboard' && (
          <>
            {/* VES Balance */}
            <div className="mb-8">
          <StatCard
            title="Dairimar's VES Balance"
            value={balances?.dai_ves.toLocaleString() || '0'}
            subtitle="Available for VES orders"
            color="primary"
            icon={<span className="text-5xl">🇻🇪</span>}
          />
        </div>

        {/* Submit Order Form */}
        <Card className="mb-8">
          <h2 className="text-2xl font-bold mb-6">Submit New Order 📝</h2>

          {/* Order Type Tabs */}
          <div className="flex gap-3 mb-6">
            <Button
              onClick={() => {
                setOrderType('VES');
                setFormData({ bank: '', customer_id: '', phone_number: '' });
                setPasteValue('');
              }}
              variant={orderType === 'VES' ? 'primary' : 'secondary'}
              size="md"
            >
              🇻🇪 VES Order
            </Button>
            <Button
              onClick={() => {
                setOrderType('COP');
                setFormData({ bank: '', customer_id: '', phone_number: '' });
                setPasteValue('');
              }}
              variant={orderType === 'COP' ? 'success' : 'secondary'}
              size="md"
            >
              🇨🇴 COP Order
            </Button>
          </div>

          {/* Quick Paste Feature (VES only) */}
          {orderType === 'VES' && (
            <Card className="bg-cyan-900/30 border-2 border-cyan-500/50 mb-6">
              <h3 className="text-sm font-semibold text-cyan-300 mb-2">⚡ Quick Paste</h3>
              <p className="text-xs text-cyan-200 mb-4">
                Paste format: [Bank Code][ID][Phone] (23 digits)
                <br />
                Example: 01023015990104122030300
              </p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={pasteValue}
                  onChange={(e) => handleQuickPaste(e.target.value)}
                  placeholder="Paste customer info here..."
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                />
                <Button
                  onClick={() => {
                    setPasteValue('');
                    setFormData({ bank: '', customer_id: '', phone_number: '' });
                  }}
                  variant="secondary"
                  size="md"
                >
                  Clear
                </Button>
              </div>
            </Card>
          )}

          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
              <input
                type="text"
                name="customer_name"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount ({orderType})
              </label>
              <input
                type="number"
                name="amount"
                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                required
                min="1"
                step={orderType === 'VES' ? '1' : '1'}
              />
            </div>

            {/* Optional Customer Payment Information */}
            <div className="border-t border-gray-700 pt-4">
              <p className="text-sm text-gray-400 mb-4">
                Optional Customer Payment Information
              </p>

              {/* Bank Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Bank</label>
                <select
                  name="bank"
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Select Bank (Optional) --</option>
                  {BANKS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Phone Number */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="e.g., 04121234567"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Customer ID */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">ID Number</label>
                <input
                  type="text"
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  placeholder="e.g., 30159901"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Account Number */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                <input
                  type="text"
                  name="account_number"
                  placeholder="Bank account number"
                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-3 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant={orderType === 'VES' ? 'primary' : 'success'}
              fullWidth
              size="lg"
            >
              Submit {orderType} Order
            </Button>
          </form>
        </Card>

        {/* My Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VES Orders */}
          <Card>
            <h3 className="text-2xl font-bold mb-6">My VES Orders 🇻🇪</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myOrders.ves.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No VES orders yet</p>
              ) : (
                myOrders.ves.map((order) => (
                  <div
                    key={order.id}
                    className={`border-l-4 ${
                      order.status === 'COMPLETED' ? 'border-green-500 bg-green-900/20' :
                      order.status === 'PENDING' ? 'border-yellow-500 bg-yellow-900/20' :
                      'border-red-500 bg-red-900/20'
                    } rounded-lg p-4`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-white text-lg">{order.customer_name}</p>
                        <p className="text-sm text-gray-300">
                          {parseFloat(order.amount_ves as any).toLocaleString()} VES
                        </p>
                        {order.status === 'COMPLETED' && order.exchange_rate && (
                          <p className="text-xs text-green-400 font-semibold mt-1">
                            Rate: {parseFloat(order.exchange_rate as any).toLocaleString()} VES/USDT
                          </p>
                        )}
                        {/* Customer Payment Info */}
                        {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                          <div className="mt-2 text-xs text-gray-400 space-y-1">
                            {order.bank && <p>🏦 {order.bank}</p>}
                            {order.phone_number && <p>📱 {order.phone_number}</p>}
                            {order.customer_id && <p>🆔 {order.customer_id}</p>}
                            {order.account_number && <p>💳 {order.account_number}</p>}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-medium ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : order.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    {order.status === 'PENDING' && (
                      <>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
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
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
                              <input
                                type="text"
                                name="customer_name"
                                defaultValue={order.customer_name}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
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
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Bank</label>
                                <input
                                  type="text"
                                  name="bank"
                                  defaultValue={order.bank || ''}
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                                <input
                                  type="text"
                                  name="phone_number"
                                  defaultValue={order.phone_number || ''}
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
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
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                                <input
                                  type="text"
                                  name="account_number"
                                  defaultValue={order.account_number || ''}
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
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
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>

          {/* COP Orders */}
          <Card>
            <h3 className="text-2xl font-bold mb-6">My COP Orders 🇨🇴</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {myOrders.cop.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No COP orders yet</p>
              ) : (
                myOrders.cop.map((order) => (
                  <div
                    key={order.id}
                    className={`border-l-4 ${
                      order.status === 'COMPLETED' ? 'border-green-500 bg-green-900/20' :
                      order.status === 'PENDING' ? 'border-yellow-500 bg-yellow-900/20' :
                      'border-red-500 bg-red-900/20'
                    } rounded-lg p-4`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-white text-lg">{order.customer_name}</p>
                        <p className="text-sm text-gray-300">
                          {parseFloat(order.amount_cop as any).toLocaleString()} COP
                        </p>
                        {order.status === 'COMPLETED' && order.exchange_rate && (
                          <p className="text-xs text-green-400 font-semibold mt-1">
                            Rate: {parseFloat(order.exchange_rate as any).toLocaleString()} COP/USDT
                          </p>
                        )}
                        {/* Customer Payment Info */}
                        {(order.bank || order.phone_number || order.customer_id || order.account_number) && (
                          <div className="mt-2 text-xs text-gray-400 space-y-1">
                            {order.bank && <p>🏦 {order.bank}</p>}
                            {order.phone_number && <p>📱 {order.phone_number}</p>}
                            {order.customer_id && <p>🆔 {order.customer_id}</p>}
                            {order.account_number && <p>💳 {order.account_number}</p>}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-3 py-1 text-xs rounded-full font-medium ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                            : order.status === 'PENDING'
                            ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                    {order.status === 'PENDING' && (
                      <>
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => setShowEditForm({ id: order.id, type: 'COP' })}
                          >
                            ✏️ Edit
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleCancelOrder(order.id, 'COP', order.customer_name)}
                          >
                            ❌ Cancel
                          </Button>
                        </div>
                        {showEditForm?.id === order.id && showEditForm.type === 'COP' && (
                          <form
                            onSubmit={(e) => handleEditOrder(order.id, 'COP', e)}
                            className="mt-4 pt-4 border-t border-gray-700 space-y-3"
                          >
                            <div>
                              <label className="block text-sm font-medium text-gray-300 mb-2">Customer Name</label>
                              <input
                                type="text"
                                name="customer_name"
                                defaultValue={order.customer_name}
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
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
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Bank</label>
                                <input
                                  type="text"
                                  name="bank"
                                  defaultValue={order.bank || ''}
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Phone</label>
                                <input
                                  type="text"
                                  name="phone_number"
                                  defaultValue={order.phone_number || ''}
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
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
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
                                <input
                                  type="text"
                                  name="account_number"
                                  defaultValue={order.account_number || ''}
                                  className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white px-4 py-2"
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
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
          </>
        )}
      </main>
    </div>
  );
}
