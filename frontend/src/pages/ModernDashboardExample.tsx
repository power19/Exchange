import React, { useState } from 'react';
import { Card, StatCard, TransactionItem, ProgressBar, Button } from '../components/modern';

/**
 * Modern Dashboard Example
 * Showcases the new design system inspired by contemporary financial apps
 *
 * This is a prototype/example - integrate with actual API calls from services/api.ts
 */
const ModernDashboardExample: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Mock data - replace with actual API calls
  const stats = {
    brianBalance: 15420.50,
    daiBalance: 8250.30,
    totalProfit: 2520.05,
    monthlyRevenue: 25520.00,
  };

  const recentTransactions = [
    {
      id: 1,
      type: 'VES Order',
      subtitle: 'Customer #1234',
      amount: -75.00,
      status: 'Completed',
      category: 'VES',
      date: '23 Mar, 2022',
      icon: '🇻🇪',
    },
    {
      id: 2,
      type: 'USDT Purchase',
      subtitle: '500 USDT purchased',
      amount: +500.00,
      category: 'Purchase',
      date: '23 Mar, 2022',
      icon: '💰',
    },
    {
      id: 3,
      type: 'Transfer to Dairimar',
      subtitle: 'Transferred to Dairimar',
      amount: -200.00,
      category: 'Transfer',
      date: '22 Mar, 2022',
      icon: '📤',
    },
    {
      id: 4,
      type: 'COP Order',
      subtitle: 'Customer #5678',
      amount: -125.00,
      status: 'Completed',
      category: 'COP',
      date: '21 Mar, 2022',
      icon: '🇨🇴',
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0E27] text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Good Morning, Brian! 👋</h1>
            <p className="text-gray-400">Here's your financial overview</p>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="sm">
              📊 Reports
            </Button>
            <Button variant="primary" size="sm">
              + New Transaction
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Your USDT Balance"
          value={`$${stats.brianBalance.toLocaleString()}`}
          subtitle="Available to operate"
          color="primary"
          trend={{ value: 12.5, isPositive: true }}
        />
        <StatCard
          title="Dairimar's Balance"
          value={`$${stats.daiBalance.toLocaleString()}`}
          subtitle="USDT + VES equivalent"
          color="success"
        />
        <StatCard
          title="Total Profit"
          value={`$${stats.totalProfit.toLocaleString()}`}
          subtitle="10% commission"
          color="warning"
          trend={{ value: 8.2, isPositive: true }}
        />
        <StatCard
          title="Monthly Revenue"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          subtitle="Orders fulfilled"
          color="primary"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Recent Activity */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Recent Activity</h2>
              <div className="flex gap-2">
                {(['today', 'week', 'month'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period)}
                    className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${selectedPeriod === period
                        ? 'bg-cyan-500 text-white'
                        : 'bg-transparent text-gray-400 hover:text-white'
                      }
                    `}
                  >
                    {period.charAt(0).toUpperCase() + period.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {recentTransactions.map((tx) => (
                <TransactionItem
                  key={tx.id}
                  icon={tx.icon}
                  iconBg={tx.amount > 0 ? 'bg-green-500/20' : 'bg-red-500/20'}
                  title={tx.type}
                  subtitle={tx.subtitle}
                  amount={`${tx.amount > 0 ? '+' : ''}$${Math.abs(tx.amount).toLocaleString()}`}
                  amountColor={tx.amount > 0 ? 'positive' : 'negative'}
                  category={tx.category}
                  categoryColor={
                    tx.category === 'VES' ? '#9C27B0' :
                    tx.category === 'COP' ? '#FF9800' :
                    tx.category === 'Purchase' ? '#4CAF50' :
                    '#00BCD4'
                  }
                  date={tx.date}
                />
              ))}
            </div>

            <div className="mt-6 text-center">
              <Button variant="ghost" size="sm">
                View All Transactions →
              </Button>
            </div>
          </Card>

          {/* Activity Chart Placeholder */}
          <Card className="mt-6">
            <h3 className="text-lg font-bold mb-4">Activity Statistics</h3>
            <div className="h-64 flex items-center justify-center bg-gray-800/30 rounded-xl">
              <p className="text-gray-500">
                📊 Chart Component (Install recharts or chart.js)
              </p>
            </div>
          </Card>
        </div>

        {/* Right Column - Goals & Savings */}
        <div className="space-y-6">
          {/* Goals Card */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold">Goals</h3>
              <button className="text-cyan-400 text-sm hover:underline">
                View All →
              </button>
            </div>

            <div className="space-y-4">
              <ProgressBar
                label="USDT Reserve"
                current={15420}
                target={20000}
                color="#4DD0E1"
              />
              <ProgressBar
                label="Monthly Target"
                current={25520}
                target={30000}
                color="#4CAF50"
              />
              <ProgressBar
                label="Profit Goal"
                current={2520}
                target={5000}
                color="#FF9800"
              />
            </div>
          </Card>

          {/* Quick Actions Card */}
          <Card>
            <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button variant="primary" fullWidth size="md">
                💵 Buy USDT
              </Button>
              <Button variant="secondary" fullWidth size="md">
                📤 Transfer to Dairimar
              </Button>
              <Button variant="success" fullWidth size="md">
                ✅ Fulfill COP Order
              </Button>
              <Button variant="ghost" fullWidth size="md">
                💰 Withdraw Profit
              </Button>
            </div>
          </Card>

          {/* Pending Orders Card */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Pending Orders</h3>
              <span className="bg-orange-500/20 text-orange-400 text-xs font-medium px-2 py-1 rounded-full">
                5 pending
              </span>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">VES Orders</p>
                  <p className="text-xs text-gray-400">3 waiting</p>
                </div>
                <span className="text-purple-400 font-semibold">🇻🇪</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium">COP Orders</p>
                  <p className="text-xs text-gray-400">2 waiting</p>
                </div>
                <span className="text-orange-400 font-semibold">🇨🇴</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ModernDashboardExample;
