import React, { memo } from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Modern Card Component
 * Styled card with dark theme and subtle animations
 * Memoized to prevent unnecessary re-renders
 */
export const Card = memo<CardProps>(function Card({
  children,
  className = '',
  hover = false,
  onClick,
  padding = 'md',
}) {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div
      className={`
        bg-[#1a1f3a] rounded-2xl shadow-lg
        ${hover ? 'transition-all duration-200 hover:shadow-2xl hover:bg-[#1f2547] cursor-pointer' : ''}
        ${paddingClasses[padding]}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      onClick={onClick}
      style={{
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.25)',
      }}
    >
      {children}
    </div>
  );
});
