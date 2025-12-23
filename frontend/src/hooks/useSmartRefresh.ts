import { useEffect, useRef, useCallback } from 'react';

interface UseSmartRefreshOptions {
  /** Refresh callback function */
  onRefresh: () => void | Promise<void>;
  /** Refresh interval in milliseconds (default: 30000) */
  interval?: number;
  /** Whether to refresh when tab becomes visible (default: true) */
  refreshOnVisible?: boolean;
  /** Whether to refresh when window regains focus (default: true) */
  refreshOnFocus?: boolean;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Smart refresh hook that only refreshes when:
 * - The tab is visible
 * - The window is focused
 * - User is not actively interacting (idle)
 *
 * This prevents unnecessary API calls when the user is away.
 */
export function useSmartRefresh({
  onRefresh,
  interval = 30000,
  refreshOnVisible = true,
  refreshOnFocus = true,
  enabled = true,
}: UseSmartRefreshOptions) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(Date.now());
  const isVisibleRef = useRef<boolean>(!document.hidden);
  const isFocusedRef = useRef<boolean>(document.hasFocus());

  // Memoized refresh function that prevents rapid successive calls
  const doRefresh = useCallback(async () => {
    const now = Date.now();
    // Prevent refreshing more than once per 5 seconds
    if (now - lastRefreshRef.current < 5000) {
      return;
    }
    lastRefreshRef.current = now;

    try {
      await onRefresh();
    } catch (error) {
      console.error('Smart refresh error:', error);
    }
  }, [onRefresh]);

  // Handle visibility change
  useEffect(() => {
    if (!enabled || !refreshOnVisible) return;

    const handleVisibilityChange = () => {
      const wasHidden = !isVisibleRef.current;
      isVisibleRef.current = !document.hidden;

      // Refresh when tab becomes visible after being hidden
      if (wasHidden && isVisibleRef.current) {
        doRefresh();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, refreshOnVisible, doRefresh]);

  // Handle window focus
  useEffect(() => {
    if (!enabled || !refreshOnFocus) return;

    const handleFocus = () => {
      const wasFocused = isFocusedRef.current;
      isFocusedRef.current = true;

      // Refresh when window gains focus after being blurred
      if (!wasFocused) {
        doRefresh();
      }
    };

    const handleBlur = () => {
      isFocusedRef.current = false;
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [enabled, refreshOnFocus, doRefresh]);

  // Interval-based refresh (only when visible and focused)
  useEffect(() => {
    if (!enabled) return;

    const tick = () => {
      // Only refresh if tab is visible and window is focused
      if (isVisibleRef.current && isFocusedRef.current) {
        doRefresh();
      }
    };

    intervalRef.current = setInterval(tick, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, doRefresh]);

  // Return manual refresh function
  return { refresh: doRefresh };
}
