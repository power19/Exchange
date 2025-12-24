import React, { memo } from 'react';
import { Card } from './Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

/**
 * Stat Card Component
 * Displays financial metrics with optional trend indicators
 * Memoized to prevent unnecessary re-renders
 */
export const StatCard = memo<StatCardProps>(function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  color = 'primary',
  className = '',
}) {
  const colorClasses = {
    primary: 'text-cyan-400',
    success: 'text-green-400',
    warning: 'text-orange-400',
    error: 'text-red-400',
  };

  return (
    <Card hover className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm mb-2">{title}</p>
          <h3 className={`text-3xl font-bold ${colorClasses[color]} mb-1`}>
            {value}
          </h3>
          {subtitle && (
            <p className="text-gray-500 text-xs">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${trend.isPositive ? 'text-green-400' : 'text-red-400'}`}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-gray-500 text-xs ml-2">vs last period</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="ml-4 text-gray-600">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
});
