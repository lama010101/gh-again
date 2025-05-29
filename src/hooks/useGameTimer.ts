import { useState, useEffect, useCallback } from 'react';

interface UseGameTimerOptions {
  initialTime: number;
  onTimeout: () => void;
  isActive: boolean;
}

export function useGameTimer({
  initialTime,
  onTimeout,
  isActive
}: UseGameTimerOptions) {
  const [remainingTime, setRemainingTime] = useState(initialTime);
  const [hasTimedOut, setHasTimedOut] = useState(false);

  // Reset timer when initialTime changes
  useEffect(() => {
    setRemainingTime(initialTime);
    setHasTimedOut(false);
  }, [initialTime]);

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (isActive && remainingTime > 0 && !hasTimedOut) {
      timer = setTimeout(() => {
        const newTime = remainingTime - 1;
        setRemainingTime(newTime);
        
        if (newTime <= 0) {
          setHasTimedOut(true);
          onTimeout();
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isActive, remainingTime, hasTimedOut, onTimeout]);

  const resetTimer = useCallback(() => {
    setRemainingTime(initialTime);
    setHasTimedOut(false);
  }, [initialTime]);

  const pauseTimer = useCallback(() => {
    // This is a placeholder - the actual pausing is controlled by the isActive prop
    return;
  }, []);

  return {
    remainingTime,
    setRemainingTime,
    hasTimedOut,
    setHasTimedOut,
    resetTimer,
    pauseTimer
  };
}
