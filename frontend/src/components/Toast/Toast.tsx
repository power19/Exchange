import { memo, useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const iconMap = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

const colorMap = {
  success: 'from-green-500/90 to-green-600/90 border-green-400',
  error: 'from-red-500/90 to-red-600/90 border-red-400',
  warning: 'from-yellow-500/90 to-yellow-600/90 border-yellow-400',
  info: 'from-cyan-500/90 to-cyan-600/90 border-cyan-400'
};

export const Toast = memo<ToastProps>(function Toast({
  id,
  message,
  type,
  duration = 4000,
  onClose
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onClose(id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onClose(id), 300);
  };

  return (
    <div
      className={`
        flex items-center gap-3 px-4 py-3 rounded-xl border backdrop-blur-sm
        bg-gradient-to-r ${colorMap[type]}
        shadow-lg shadow-black/20
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <span className="text-xl">{iconMap[type]}</span>
      <p className="text-white font-medium flex-1 text-sm whitespace-pre-line">{message}</p>
      <button
        onClick={handleClose}
        className="text-white/70 hover:text-white transition-colors p-1"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
});
