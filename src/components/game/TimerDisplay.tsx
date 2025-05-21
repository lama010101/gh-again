import React, { useEffect, useRef } from 'react';
import { useGame } from '@/contexts/GameContext';
import { useSettingsStore } from '@/lib/useSettingsStore';

interface TimerDisplayProps {
  remainingTime: number;
  setRemainingTime: React.Dispatch<React.SetStateAction<number>>;
  isActive: boolean;
  onTimeout?: () => void;
  roundTimerSec: number;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({
  remainingTime,
  setRemainingTime,
  isActive,
  onTimeout
}) => {
  const { roundTimerSec } = useGame();
  const initializedRef = useRef(false);
  const { soundEnabled } = useSettingsStore();
  const countdownBeepRef = useRef<HTMLAudioElement | null>(null);
  
  // Initialize audio element
  useEffect(() => {
    if (typeof window !== 'undefined') {
      countdownBeepRef.current = new Audio('/sounds/countdown-beep.mp3');
      countdownBeepRef.current.preload = 'auto';
    }
    
    return () => {
      if (countdownBeepRef.current) {
        countdownBeepRef.current.pause();
        countdownBeepRef.current = null;
      }
    };
  }, []);
  
  // Play countdown sound effect when time <= 10 seconds
  useEffect(() => {
    if (isActive && remainingTime <= 10 && remainingTime > 0 && soundEnabled) {
      if (countdownBeepRef.current) {
        // Clone the audio to allow rapid playback
        const beepSound = countdownBeepRef.current.cloneNode() as HTMLAudioElement;
        beepSound.volume = 0.5;
        beepSound.play().catch(e => console.error('Error playing countdown sound:', e));
      }
    }
  }, [remainingTime, isActive, soundEnabled]);
  
  // Always update timer when roundTimerSec changes
  useEffect(() => {
    if (roundTimerSec > 0) {
      setRemainingTime(roundTimerSec);
    }
  }, [roundTimerSec, setRemainingTime]);

  // Skip timer if roundTimerSec is 0 (no timer)
  if (roundTimerSec === 0) {
    return null;
  }
  
  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isActive && remainingTime > 0) {
      interval = setInterval(() => {
        setRemainingTime(prevTime => {
          const newTime = prevTime - 1;
          if (newTime <= 0) {
            // Clear interval first to prevent multiple timeouts
            if (interval) clearInterval(interval);
            // Trigger timeout on next tick to avoid state update during render
            setTimeout(() => onTimeout?.(), 0);
            return 0;
          }
          return newTime;
        });
      }, 1000);
    } else if (remainingTime <= 0 && onTimeout && isActive) {
      // Ensure timeout is called if component mounts with 0 time
      onTimeout();
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, remainingTime, onTimeout, setRemainingTime]);

  // Skip rendering if timer is disabled
  if (roundTimerSec === 0) {
    return null;
  }

  const isCritical = remainingTime <= 10;
  
  return (
    <div className={`flex items-center justify-center rounded-full h-12 w-12 md:h-14 md:w-14 text-white font-bold text-base md:text-lg
      ${isCritical ? 'bg-red-600 animate-pulse' : 'bg-black/70'} shadow-lg border-2 ${isCritical ? 'border-red-400' : 'border-white/20'}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="sr-only">Time remaining: </span>
      {formatTime(remainingTime)}
    </div>
  );
};

export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default TimerDisplay;
