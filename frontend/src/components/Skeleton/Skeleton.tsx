import { memo } from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = memo<SkeletonProps>(function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse'
}) {
  const baseClasses = 'bg-gray-700';

  const variantClasses = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-xl'
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  const style: React.CSSProperties = {
    width: width || (variant === 'text' ? '100%' : undefined),
    height: height || (variant === 'text' ? '1em' : undefined)
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
});

// Pre-built skeleton patterns
export const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div className="bg-[#1a1f3a] rounded-2xl p-6 shadow-lg">
      <Skeleton variant="text" width="40%" height={16} className="mb-3" />
      <Skeleton variant="text" width="70%" height={32} className="mb-2" />
      <Skeleton variant="text" width="50%" height={12} />
    </div>
  );
});

export const SkeletonStatCard = memo(function SkeletonStatCard() {
  return (
    <div className="bg-[#1a1f3a] rounded-2xl p-6 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton variant="text" width={100} height={14} className="mb-3" />
          <Skeleton variant="text" width={150} height={36} className="mb-2" />
          <Skeleton variant="text" width={80} height={12} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  );
});

export const SkeletonOrderItem = memo(function SkeletonOrderItem() {
  return (
    <div className="bg-[#151932] border border-gray-700 rounded-lg p-5">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <Skeleton variant="text" width="60%" height={20} className="mb-2" />
          <Skeleton variant="text" width="40%" height={18} className="mb-2" />
          <Skeleton variant="text" width="30%" height={14} />
        </div>
        <Skeleton variant="rectangular" width={120} height={40} />
      </div>
    </div>
  );
});

export const SkeletonTable = memo(function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 bg-[#151932] rounded-lg">
          <Skeleton variant="circular" width={40} height={40} />
          <div className="flex-1">
            <Skeleton variant="text" width="50%" height={16} className="mb-2" />
            <Skeleton variant="text" width="30%" height={12} />
          </div>
          <Skeleton variant="text" width={80} height={20} />
        </div>
      ))}
    </div>
  );
});
