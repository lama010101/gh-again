import { useEffect } from 'react';

export const useMetricsRefresh = (gameId: string | null | undefined, refreshGlobalMetrics: () => void) => {
  useEffect(() => {
    let refreshMetricsTimer: number | null = null;

    const startTimer = () => {
      if (gameId) {
        refreshMetricsTimer = window.setInterval(() => {
          try {
            refreshGlobalMetrics();
          } catch (err) {
            console.error('Error refreshing global metrics:', err);
          }
        }, 5000);
      }
    };

    const clearTimer = () => {
      if (refreshMetricsTimer !== null) {
        clearInterval(refreshMetricsTimer);
        refreshMetricsTimer = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
      } else {
        clearTimer();
        startTimer();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!document.hidden && gameId) {
      startTimer();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimer();
    };
  }, [gameId, refreshGlobalMetrics]);
};
