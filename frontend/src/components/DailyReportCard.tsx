import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { DailyReport } from '../types';

export default function DailyReportCard() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [completedOrders, setCompletedOrders] = useState<any[]>([]);

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const [reportRes, ordersRes] = await Promise.all([
        api.getDailyReport(selectedDate),
        api.getOrdersReport(selectedDate, selectedDate)
      ]);
      setReport(reportRes.data);
      setCompletedOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Daily Report</h3>
          <p className="text-sm text-gray-600 mt-1">
            {new Date(selectedDate).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* VES Orders Summary */}
        <div className="border-l-4 border-purple-500 pl-4 py-2 bg-purple-50">
          <p className="text-sm text-gray-600 font-medium">VES Orders</p>
          <p className="text-2xl font-bold text-purple-700">{report.ves_orders.count}</p>
          <p className="text-xs text-gray-500">
            {Number(report.ves_orders.total_ves).toLocaleString()} VES
          </p>
          <p className="text-sm font-semibold text-purple-600">
            {report.ves_orders.total_usdt.toFixed(2)} USDT
          </p>
        </div>

        {/* COP Orders Summary */}
        <div className="border-l-4 border-blue-500 pl-4 py-2 bg-blue-50">
          <p className="text-sm text-gray-600 font-medium">COP Orders</p>
          <p className="text-2xl font-bold text-blue-700">{report.cop_orders.count}</p>
          <p className="text-xs text-gray-500">
            {Number(report.cop_orders.total_cop).toLocaleString()} COP
          </p>
          <p className="text-sm font-semibold text-blue-600">
            {report.cop_orders.total_usdt.toFixed(2)} USDT
          </p>
        </div>

        {/* Total Summary */}
        <div className="border-l-4 border-green-500 pl-4 py-2 bg-green-50">
          <p className="text-sm text-gray-600 font-medium">Total USDT Sold</p>
          <p className="text-2xl font-bold text-green-700">
            {report.total_usdt_sold.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500">Gross Profit (10%)</p>
          <p className="text-sm font-semibold text-green-600">
            {report.profit.gross.toFixed(2)} USDT
          </p>
        </div>
      </div>

      {/* Additional Details */}
      <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-gray-600">Purchases</p>
          <p className="font-semibold">
            {report.purchases.count} • {report.purchases.total_usdt.toFixed(2)} USDT
          </p>
        </div>
        <div>
          <p className="text-gray-600">Transfers</p>
          <p className="font-semibold">
            {report.transfers.count} • {report.transfers.total_usdt.toFixed(2)} USDT
          </p>
        </div>
        <div>
          <p className="text-gray-600">Conversions</p>
          <p className="font-semibold">
            {report.conversions.count} • {report.conversions.total_usdt.toFixed(2)} USDT → {Number(report.conversions.total_ves).toLocaleString()} VES
          </p>
        </div>
      </div>

      {/* Completed Orders List */}
      {completedOrders.length > 0 && (
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-lg font-semibold text-gray-800 mb-3">
            Completed Orders ({completedOrders.length})
          </h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {completedOrders.map((order: any, idx: number) => (
              <div
                key={idx}
                className={`border-l-4 ${
                  order.order_type === 'VES' ? 'border-purple-500 bg-purple-50' : 'border-blue-500 bg-blue-50'
                } p-4 rounded-r-lg`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        order.order_type === 'VES' ? 'bg-purple-200 text-purple-800' : 'bg-blue-200 text-blue-800'
                      }`}>
                        {order.order_type}
                      </span>
                      <span className="font-bold text-gray-800">{order.customer_name}</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {order.order_type === 'VES'
                        ? `${parseFloat(order.amount).toLocaleString()} VES`
                        : `${parseFloat(order.amount).toLocaleString()} COP`}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Completed: {new Date(order.date_completed).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-green-600">
                      {parseFloat(order.usdt_sold).toFixed(2)} USDT
                    </p>
                    <p className="text-xs text-gray-600">
                      @ {parseFloat(order.exchange_rate).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
