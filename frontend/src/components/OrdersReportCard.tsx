import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { Card, Button } from './modern';
import { formatDateTime, getTodayDateString, TIMEZONE } from '../utils/dateUtils';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface PeriodSummary {
  ves_count: number;
  ves_total: number;
  ves_usdt: number;
  cop_count: number;
  cop_total: number;
  cop_usdt: number;
  total_usdt: number;
  total_orders: number;
}

export default function OrdersReportCard() {
  const [period, setPeriod] = useState<Period>('daily');
  const [orders, setOrders] = useState<any[]>([]);
  const [summary, setSummary] = useState<PeriodSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayDateString());

  useEffect(() => {
    loadOrders();
  }, [period, selectedDate]);

  const getDateRange = (): { start: string; end: string } => {
    const selected = new Date(selectedDate);
    const start = new Date(selected);
    const end = new Date(selected);

    switch (period) {
      case 'daily':
        // Same day
        break;

      case 'weekly':
        // Start of week (Monday)
        const dayOfWeek = start.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday
        start.setDate(start.getDate() + diff);
        end.setDate(start.getDate() + 6); // Sunday
        break;

      case 'monthly':
        // Start and end of month
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0); // Last day of month
        break;

      case 'yearly':
        // Start and end of year
        start.setMonth(0, 1);
        end.setMonth(11, 31);
        break;
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();
      const response = await api.getOrdersReport(start, end);
      const data = response.data;
      setOrders(data);

      // Calculate summary
      const vesSummary = data.filter((o: any) => o.order_type === 'VES');
      const copSummary = data.filter((o: any) => o.order_type === 'COP');

      setSummary({
        ves_count: vesSummary.length,
        ves_total: vesSummary.reduce((sum: number, o: any) => sum + parseFloat(o.amount), 0),
        ves_usdt: vesSummary.reduce((sum: number, o: any) => sum + parseFloat(o.usdt_sold), 0),
        cop_count: copSummary.length,
        cop_total: copSummary.reduce((sum: number, o: any) => sum + parseFloat(o.amount), 0),
        cop_usdt: copSummary.reduce((sum: number, o: any) => sum + parseFloat(o.usdt_sold), 0),
        total_usdt: data.reduce((sum: number, o: any) => sum + parseFloat(o.usdt_sold), 0),
        total_orders: data.length
      });
    } catch (error) {
      console.error('Error loading orders report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPeriodLabel = (): string => {
    const { start, end } = getDateRange();
    const startDate = new Date(start);
    const endDate = new Date(end);

    switch (period) {
      case 'daily':
        return startDate.toLocaleDateString('en-US', {
          timeZone: TIMEZONE,
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

      case 'weekly':
        return `Week of ${startDate.toLocaleDateString('en-US', { timeZone: TIMEZONE, month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { timeZone: TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' })}`;

      case 'monthly':
        return startDate.toLocaleDateString('en-US', { timeZone: TIMEZONE, month: 'long', year: 'numeric' });

      case 'yearly':
        return startDate.getFullYear().toString();
    }
  };

  if (loading) {
    return (
      <Card>
        <p className="text-gray-400">Loading orders report...</p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-white mb-2">📊 Orders Report</h3>
        <p className="text-sm text-gray-400">{getPeriodLabel()}</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button
          variant={period === 'daily' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setPeriod('daily')}
        >
          Daily
        </Button>
        <Button
          variant={period === 'weekly' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setPeriod('weekly')}
        >
          Weekly
        </Button>
        <Button
          variant={period === 'monthly' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setPeriod('monthly')}
        >
          Monthly
        </Button>
        <Button
          variant={period === 'yearly' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setPeriod('yearly')}
        >
          Yearly
        </Button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="ml-auto px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* VES Summary */}
          <div className="bg-[#151932] border border-purple-500/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">VES Orders</p>
            <p className="text-3xl font-bold text-purple-400">{summary.ves_count}</p>
            <p className="text-xs text-gray-500 mt-2">
              {summary.ves_total.toLocaleString()} VES
            </p>
            <p className="text-lg font-semibold text-purple-300 mt-1">
              {summary.ves_usdt.toFixed(2)} USDT
            </p>
          </div>

          {/* COP Summary */}
          <div className="bg-[#151932] border border-orange-500/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">COP Orders</p>
            <p className="text-3xl font-bold text-orange-400">{summary.cop_count}</p>
            <p className="text-xs text-gray-500 mt-2">
              {summary.cop_total.toLocaleString()} COP
            </p>
            <p className="text-lg font-semibold text-orange-300 mt-1">
              {summary.cop_usdt.toFixed(2)} USDT
            </p>
          </div>

          {/* Total Summary */}
          <div className="bg-[#151932] border border-green-500/30 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">Total USDT Sold</p>
            <p className="text-3xl font-bold text-green-400">
              {summary.total_usdt.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 mt-2">
              {summary.total_orders} orders
            </p>
            <p className="text-lg font-semibold text-green-300 mt-1">
              Profit: {(summary.total_usdt * 0.10).toFixed(2)} USDT
            </p>
          </div>
        </div>
      )}

      {/* Orders List */}
      {orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No orders for this period</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {orders.map((order: any, idx: number) => (
            <div
              key={idx}
              className={`border-l-4 ${
                order.order_type === 'VES' ? 'border-purple-500 bg-purple-900/20' : 'border-orange-500 bg-orange-900/20'
              } p-4 rounded-r-lg`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded ${
                        order.order_type === 'VES'
                          ? 'bg-purple-500/30 text-purple-300'
                          : 'bg-orange-500/30 text-orange-300'
                      }`}
                    >
                      {order.order_type}
                    </span>
                    <span className="font-bold text-white">{order.customer_name}</span>
                  </div>
                  <p className="text-sm text-gray-300">
                    {order.order_type === 'VES'
                      ? `${parseFloat(order.amount).toLocaleString()} VES`
                      : `${parseFloat(order.amount).toLocaleString()} COP`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDateTime(order.date_completed)}
                  </p>
                </div>
                <div className="text-right ml-4">
                  <p className="text-lg font-bold text-green-400">
                    {parseFloat(order.usdt_sold).toFixed(2)} USDT
                  </p>
                  <p className="text-xs text-gray-500">
                    @ {parseFloat(order.exchange_rate).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
