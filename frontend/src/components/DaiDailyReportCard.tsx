import { useState, useEffect } from 'react';
import * as api from '../services/api';
import type { DaiDailyReport, DaiDailyReportOrder } from '../types';
import { Clipboard } from '@capacitor/clipboard';
import { Capacitor } from '@capacitor/core';

export default function DaiDailyReportCard() {
  const [report, setReport] = useState<DaiDailyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'orders' | 'conversions'>('orders');
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);

  useEffect(() => {
    loadReport();
  }, [selectedDate]);

  const loadReport = async () => {
    try {
      setLoading(true);
      const response = await api.getDaiDailyReport(selectedDate);
      setReport(response.data);
    } catch (error) {
      console.error('Error loading daily report:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (Capacitor.isNativePlatform()) {
        await Clipboard.write({ string: text });
        alert(`${label} copied!`);
      } else {
        await navigator.clipboard.writeText(text);
        alert(`${label} copied!`);
      }
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const toggleOrderDetails = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const hasPaymentInfo = (order: DaiDailyReportOrder) => {
    return order.bank || order.phone_number || order.customer_id || order.account_number;
  };

  if (loading) {
    return (
      <div className="bg-[#151932] rounded-lg p-6 border border-gray-700">
        <p className="text-gray-400">Loading report...</p>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  return (
    <div className="bg-[#151932] rounded-lg border border-gray-700 overflow-hidden">
      {/* Header with Date Selector */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-white">Daily Report</h3>
            <p className="text-base font-semibold text-gray-300 mt-1">
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
            className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
      </div>

      {/* Starting Balances */}
      <div className="p-6 bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border-b border-gray-700">
        <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
          <span className="text-purple-400">Start of Day Balances</span>
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0A0E27] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">USDT Balance</p>
            <p className="text-2xl font-bold text-green-400">
              {report.starting_balances.dai_usdt.toFixed(2)} <span className="text-sm text-gray-400">USDT</span>
            </p>
          </div>
          <div className="bg-[#0A0E27] p-4 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-500 mb-1">VES Balance</p>
            <p className="text-2xl font-bold text-purple-400">
              {report.starting_balances.dai_ves.toLocaleString()} <span className="text-sm text-gray-400">VES</span>
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <div className="flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'orders'
                ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-900/20'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            VES Orders ({report.ves_orders.count})
          </button>
          <button
            onClick={() => setActiveTab('conversions')}
            className={`flex-1 px-6 py-4 font-medium transition-colors ${
              activeTab === 'conversions'
                ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-900/20'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Conversions ({report.conversions.count})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-xs text-gray-400">Total VES Sent</p>
                <p className="text-xl font-bold text-purple-400">
                  {report.ves_orders.total_ves.toLocaleString()} VES
                </p>
              </div>
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-xs text-gray-400">Total USDT Sold</p>
                <p className="text-xl font-bold text-green-400">
                  {report.ves_orders.total_usdt.toFixed(2)} USDT
                </p>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {report.ves_orders.orders.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No orders completed on this date</p>
              ) : (
                report.ves_orders.orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-[#0A0E27] border border-gray-700 rounded-lg overflow-hidden"
                  >
                    {/* Minimalistic Row - Always visible */}
                    <div
                      onClick={() => toggleOrderDetails(order.id)}
                      className="p-4 cursor-pointer hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-white">{order.customer_name}</span>
                          <span className="text-purple-400 font-semibold">
                            {order.amount_ves.toLocaleString()} VES
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-green-400 font-bold">
                            {order.usdt_sold.toFixed(2)} USDT
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(order.date_completed).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className={`text-gray-400 transition-transform ${expandedOrderId === order.id ? 'rotate-180' : ''}`}>
                            {hasPaymentInfo(order) ? '...' : ''}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Details */}
                    {expandedOrderId === order.id && (
                      <div className="border-t border-gray-700 p-4 bg-gray-800/30">
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div>
                            <p className="text-gray-500">Exchange Rate</p>
                            <p className="text-white font-medium">{order.exchange_rate.toLocaleString()} VES/USDT</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Submitted</p>
                            <p className="text-white font-medium">{new Date(order.date_submitted).toLocaleDateString()}</p>
                          </div>
                        </div>

                        {hasPaymentInfo(order) && (
                          <div className="space-y-2 pt-3 border-t border-gray-700">
                            <p className="text-xs font-medium text-gray-400 mb-2">Payment Info:</p>
                            {order.bank && (
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                <span className="text-gray-300 text-sm">Bank: {order.bank}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(order.bank!, 'Bank'); }}
                                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                            {order.phone_number && (
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                <span className="text-gray-300 text-sm">Phone: {order.phone_number}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(order.phone_number!, 'Phone'); }}
                                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                            {order.customer_id && (
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                <span className="text-gray-300 text-sm">ID: {order.customer_id}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(order.customer_id!, 'ID'); }}
                                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                            {order.account_number && (
                              <div className="flex justify-between items-center bg-gray-800/50 p-2 rounded">
                                <span className="text-gray-300 text-sm">Account: {order.account_number}</span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); copyToClipboard(order.account_number!, 'Account'); }}
                                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 rounded text-white"
                                >
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Conversions Tab */}
        {activeTab === 'conversions' && (
          <div>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                <p className="text-xs text-gray-400">USDT Converted</p>
                <p className="text-xl font-bold text-green-400">
                  {report.conversions.total_usdt.toFixed(2)} USDT
                </p>
              </div>
              <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                <p className="text-xs text-gray-400">VES Received</p>
                <p className="text-xl font-bold text-purple-400">
                  {report.conversions.total_ves.toLocaleString()} VES
                </p>
              </div>
            </div>

            {/* Conversions List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {report.conversions.items.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No conversions made on this date</p>
              ) : (
                report.conversions.items.map((conversion) => (
                  <div
                    key={conversion.id}
                    className="bg-[#0A0E27] border border-gray-700 rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-green-400 font-bold">
                          {conversion.usdt_amount.toFixed(2)} USDT
                        </span>
                        <span className="text-gray-500">→</span>
                        <span className="text-purple-400 font-bold">
                          {conversion.ves_received.toLocaleString()} VES
                        </span>
                      </div>
                      <div className="text-right">
                        <p className="text-cyan-400 font-medium">
                          @ {conversion.exchange_rate.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(conversion.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
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
  );
}
