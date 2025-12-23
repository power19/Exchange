import React, { memo } from 'react';

interface TransactionItemProps {
  icon?: React.ReactNode;
  iconBg?: string;
  title: string;
  subtitle: string;
  amount: string;
  amountColor?: 'positive' | 'negative' | 'neutral';
  date?: string;
  category?: string;
  categoryColor?: string;
  onClick?: () => void;
}

/**
 * Transaction Item Component
 * Modern transaction/activity list item
 * Memoized to prevent unnecessary re-renders in lists
 */
export const TransactionItem = memo<TransactionItemProps>(function TransactionItem({
  icon,
  iconBg = 'bg-cyan-500/20',
  title,
  subtitle,
  amount,
  amountColor = 'neutral',
  date,
  category,
  categoryColor = '#4DD0E1',
  onClick,
}) {
  const amountColorClasses = {
    positive: 'text-green-400',
    negative: 'text-red-400',
    neutral: 'text-white',
  };

  return (
    <div
      className={`
        flex items-center justify-between py-4 px-4 rounded-xl
        transition-all duration-200
        ${onClick ? 'hover:bg-[#1f2547] cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      {/* Left: Icon + Info */}
      <div className="flex items-center gap-4 flex-1">
        {icon && (
          <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center text-xl`}>
            {icon}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="text-white font-medium truncate">{title}</h4>
          <p className="text-gray-400 text-sm truncate">{subtitle}</p>
          {date && (
            <p className="text-gray-500 text-xs mt-1">{date}</p>
          )}
        </div>
      </div>

      {/* Right: Category + Amount */}
      <div className="flex flex-col items-end ml-4">
        {category && (
          <span
            className="text-xs font-medium px-2 py-1 rounded-full mb-1"
            style={{
              backgroundColor: `${categoryColor}20`,
              color: categoryColor,
            }}
          >
            {category}
          </span>
        )}
        <span className={`font-semibold ${amountColorClasses[amountColor]}`}>
          {amount}
        </span>
      </div>
    </div>
  );
});
