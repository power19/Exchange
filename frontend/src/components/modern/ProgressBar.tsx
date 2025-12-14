import React from 'react';

interface ProgressBarProps {
  label: string;
  current: number;
  target: number;
  color?: string;
  showPercentage?: boolean;
  showValues?: boolean;
}

/**
 * Progress Bar Component
 * Displays progress towards a goal
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  label,
  current,
  target,
  color = '#4DD0E1',
  showPercentage = true,
  showValues = true,
}) => {
  const percentage = Math.min((current / target) * 100, 100);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{label}</span>
        {showPercentage && (
          <span className="text-gray-400 text-sm">{percentage.toFixed(0)}%</span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 10px ${color}50`,
          }}
        />
      </div>

      {/* Values */}
      {showValues && (
        <div className="flex items-center justify-between mt-2">
          <span className="text-gray-400 text-xs">
            Current: {current.toLocaleString()}
          </span>
          <span className="text-gray-400 text-xs">
            Target: {target.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  );
};
