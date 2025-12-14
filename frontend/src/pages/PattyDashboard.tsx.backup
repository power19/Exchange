import { useState, useEffect } from 'react';
import * as api from '../services/api';
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      console.log('📥 Loading data...');
      const today = new Date().toISOString().split('T')[0];

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
      alert(`Failed to load data: ${error}`);
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

      alert(`✅ Auto-filled!\nBank: ${bankName || 'Unknown code: ' + bankCode}\nID: ${idNumber}\nPhone: ${phoneNumber}`);
    } else if (cleaned.length > 0) {
      alert(`❌ Invalid format. Expected 23 digits.\nReceived: ${cleaned.length} characters\n\nFormat: [4-digit bank code][8-digit ID][11-digit phone]`);
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

      alert('Order submitted successfully!');
    } catch (error: any) {
      console.error('Order submission error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to submit order';
      alert(`Error: ${errorMsg}\n\nDetails: ${JSON.stringify(error.response?.data || error, null, 2)}`);
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
      <header className="bg-purple-600 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-white">Patty's Dashboard - Customer Orders</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Daily Report */}
        {dailyReport && (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow-lg p-6 mb-8 text-white">
            <h2 className="text-2xl font-bold mb-4">Today's Report - {dailyReport.date}</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90">VES Orders</p>
                <p className="text-2xl font-bold">{dailyReport.ves_orders.count}</p>
                <p className="text-xs opacity-80">{dailyReport.ves_orders.total_usdt.toFixed(2)} USDT</p>
              </div>

              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90">COP Orders</p>
                <p className="text-2xl font-bold">{dailyReport.cop_orders.count}</p>
                <p className="text-xs opacity-80">{dailyReport.cop_orders.total_usdt.toFixed(2)} USDT</p>
              </div>

              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90">Total Orders</p>
                <p className="text-2xl font-bold">{dailyReport.ves_orders.count + dailyReport.cop_orders.count}</p>
              </div>

              <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-sm opacity-90">Total USDT Sold</p>
                <p className="text-2xl font-bold">{dailyReport.total_usdt_sold.toFixed(2)}</p>
              </div>
            </div>

            {/* Completed Orders Today */}
            {completedOrders.length > 0 && (
              <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <h3 className="text-lg font-semibold mb-3">Completed Orders Today ({completedOrders.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {completedOrders.map((order: any, idx: number) => (
                    <div key={idx} className="bg-white/10 rounded p-3 flex justify-between items-center">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm opacity-90">
                          {order.order_type === 'VES'
                            ? `${parseFloat(order.amount).toLocaleString()} VES`
                            : `${parseFloat(order.amount).toLocaleString()} COP`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{parseFloat(order.usdt_sold).toFixed(2)} USDT</p>
                        <p className="text-xs opacity-80">
                          Rate: {parseFloat(order.exchange_rate).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VES Balance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Dairimar's VES Balance</h3>
          <p className="text-3xl font-bold text-purple-600">
            {balances?.dai_ves.toLocaleString()} VES
          </p>
        </div>

        {/* Submit Order Form */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Submit New Order</h2>

          {/* Order Type Tabs */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => {
                setOrderType('VES');
                setFormData({ bank: '', customer_id: '', phone_number: '' });
                setPasteValue('');
              }}
              className={`px-4 py-2 rounded ${orderType === 'VES' ? 'bg-purple-500 text-white' : 'bg-gray-200'}`}
            >
              VES Order
            </button>
            <button
              onClick={() => {
                setOrderType('COP');
                setFormData({ bank: '', customer_id: '', phone_number: '' });
                setPasteValue('');
              }}
              className={`px-4 py-2 rounded ${orderType === 'COP' ? 'bg-orange-500 text-white' : 'bg-gray-200'}`}
            >
              COP Order
            </button>
          </div>

          {/* Quick Paste Feature (VES only) */}
          {orderType === 'VES' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">⚡ Quick Paste</h3>
              <p className="text-xs text-blue-700 mb-3">
                Paste format: [Bank Code][ID][Phone] (23 digits)
                <br />
                Example: 01023015990104122030300
              </p>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={pasteValue}
                  onChange={(e) => handleQuickPaste(e.target.value)}
                  placeholder="Paste customer info here..."
                  className="flex-1 px-3 py-2 border border-blue-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    setPasteValue('');
                    setFormData({ bank: '', customer_id: '', phone_number: '' });
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmitOrder} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Name</label>
              <input
                type="text"
                name="customer_name"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Amount ({orderType})
              </label>
              <input
                type="number"
                name="amount"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                required
                min="1"
                step={orderType === 'VES' ? '1' : '1'}
              />
            </div>

            {/* Optional Customer Payment Information */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-500 mb-3">
                Optional Customer Payment Information
              </p>

              {/* Bank Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Bank</label>
                <select
                  name="bank"
                  value={formData.bank}
                  onChange={(e) => setFormData({...formData, bank: e.target.value})}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                >
                  <option value="">-- Select Bank (Optional) --</option>
                  {BANKS.map((bank) => (
                    <option key={bank} value={bank}>{bank}</option>
                  ))}
                </select>
              </div>

              {/* Phone Number */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                <input
                  type="text"
                  name="phone_number"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({...formData, phone_number: e.target.value})}
                  placeholder="e.g., 04121234567"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
              </div>

              {/* Customer ID */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">ID Number</label>
                <input
                  type="text"
                  name="customer_id"
                  value={formData.customer_id}
                  onChange={(e) => setFormData({...formData, customer_id: e.target.value})}
                  placeholder="e.g., 30159901"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
              </div>

              {/* Account Number */}
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700">Account Number</label>
                <input
                  type="text"
                  name="account_number"
                  placeholder="Bank account number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
                />
              </div>
            </div>

            <button
              type="submit"
              className={`w-full px-4 py-2 text-white rounded hover:opacity-90 ${
                orderType === 'VES' ? 'bg-purple-500' : 'bg-orange-500'
              }`}
            >
              Submit {orderType} Order
            </button>
          </form>
        </div>

        {/* My Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* VES Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">My VES Orders</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {myOrders.ves.length === 0 ? (
                <p className="text-gray-500">No VES orders yet</p>
              ) : (
                myOrders.ves.map((order) => (
                  <div
                    key={order.id}
                    className={`border-l-4 ${
                      order.status === 'COMPLETED' ? 'border-green-500' : 'border-yellow-500'
                    } pl-4 py-2`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {parseFloat(order.amount_ves as any).toLocaleString()} VES
                        </p>
                        {order.status === 'COMPLETED' && order.exchange_rate && (
                          <p className="text-xs text-gray-500">
                            Rate: {parseFloat(order.exchange_rate as any).toLocaleString()} VES/USDT
                          </p>
                        )}
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
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COP Orders */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">My COP Orders</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {myOrders.cop.length === 0 ? (
                <p className="text-gray-500">No COP orders yet</p>
              ) : (
                myOrders.cop.map((order) => (
                  <div
                    key={order.id}
                    className={`border-l-4 ${
                      order.status === 'COMPLETED' ? 'border-green-500' : 'border-yellow-500'
                    } pl-4 py-2`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold">{order.customer_name}</p>
                        <p className="text-sm text-gray-600">
                          {parseFloat(order.amount_cop as any).toLocaleString()} COP
                        </p>
                        {order.status === 'COMPLETED' && order.exchange_rate && (
                          <p className="text-xs text-gray-500">
                            Rate: {parseFloat(order.exchange_rate as any).toLocaleString()} COP/USDT
                          </p>
                        )}
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
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          order.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
