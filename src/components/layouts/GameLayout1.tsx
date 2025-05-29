import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import FullscreenZoomableImage from './FullscreenZoomableImage';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal'; // Import the global settings modal
import { useHint, type HintType } from '@/hooks/useHint';
import HintModal from '@/components/HintModal';
import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import TimerDisplay from '@/components/game/TimerDisplay';

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
import { useGame } from '@/contexts/GameContext';
import type { GameImage, GuessCoordinates } from '@/types/game';

type GameMode = 'solo' | 'multi';

export interface GameLayout1Props {
  /** Callback when the round is completed (e.g., when submit is clicked) */
  onComplete?: () => void | Promise<void>;
  
  /** The current game mode */
  gameMode?: GameMode;
  
  /** The current round number (1-based) */
  currentRound?: number;
  
  /** The current image being displayed */
  image: GameImage | null;
  
  /** Callback when the user selects a location on the map */
  onMapGuess: (lat: number, lng: number) => void;
  
  /** The initial guess, if any */
  initialGuess?: GuessCoordinates | null;
  
  /** The currently selected year */
  selectedYear: number;
  
  /** Callback when the year is changed */
  onYearChange: (year: number) => void;
  
  /** The remaining time in seconds */
  remainingTime: number;
  
  /** Function to update the remaining time */
  setRemainingTime: React.Dispatch<React.SetStateAction<number>>;
  
  /** Whether the timer is active */
  isTimerActive: boolean;
  
  /** Callback for navigating home */
  onNavigateHome: () => void;
  
  /** Callback for confirming navigation away from the page */
  onConfirmNavigation: (navigateTo: () => void) => void;
  
  /** Child components */
  children: React.ReactNode;
  
  /** The total game accuracy (0-100) */
  totalGameAccuracy: number;
  
  /** The total XP earned in the game */
  totalGameXP: number;
  
  /** The total number of rounds in the game */
  totalRounds: number;

  /** Number of hints used in the current round */
  hintsUsedThisRound: number;
  
  /** Total hints used in the game */
  hintsUsedTotal: number;
  
  /** Maximum number of hints allowed per game */
  HINTS_PER_GAME: number;
}

// Type guard to check if an error is an instance of Error
const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

const GameLayout1: React.FC<GameLayout1Props> = ({
  onComplete,
  gameMode = 'solo',
  currentRound = 1,
  image,
  onMapGuess,
  initialGuess,
  selectedYear,
  onYearChange,
  remainingTime,
  setRemainingTime,
  isTimerActive,
  onNavigateHome,
  onConfirmNavigation,
  children,
  totalGameAccuracy,
  totalGameXP,
  totalRounds,

  hintsUsedThisRound,
  hintsUsedTotal,
  HINTS_PER_GAME,
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(initialGuess || null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFullscreen = useCallback(() => {
    setIsFullScreen(true);
    
    // Use requestIdleCallback to avoid blocking the main thread
    const requestId = window.requestIdleCallback(() => {
      const el = document.getElementById('game-fullscreen-img');
      if (el?.requestFullscreen) {
        el.requestFullscreen().catch((err: Error) => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      }
    });
    
    return () => window.cancelIdleCallback(requestId);
  }, []);

  // Exit full screen on escape or fullscreenchange
  useEffect(() => {
    let isMounted = true;
    let rafId: number;
    
    const exitHandler = () => {
      // Use requestAnimationFrame to ensure state updates are batched
      rafId = window.requestAnimationFrame(() => {
        if (isMounted && !document.fullscreenElement) {
          setIsFullScreen(false);
        }
      });
    };
    
    // Add event listeners
    document.addEventListener('fullscreenchange', exitHandler);
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (rafId) window.cancelAnimationFrame(rafId);
      document.removeEventListener('fullscreenchange', exitHandler);
    };
  }, []);
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { roundTimerSec } = useGame(); // Only destructure roundTimerSec from useGame
  
  // Handle timer timeout
  const handleTimeout = useCallback(() => {
    // Create an AbortController for this timeout operation
    const abortController = new AbortController();
    const { signal } = abortController as { signal: AbortSignal };
    
    // Use requestIdleCallback to avoid blocking the main thread
    const idleId = window.requestIdleCallback(() => {
      if (signal.aborted) return;
      
      try {
        // If no guess was made, submit a default guess at 0,0
        if (!currentGuess) {
          onMapGuess(0, 0);
        }
        
        // Always call onComplete to proceed to the next round
        if (onComplete && !signal.aborted) {
          onComplete();
        }
      } catch (error) {
        if (!signal.aborted) {
          console.error('Error in timeout handler:', isError(error) ? error.message : 'Unknown error');
        }
      }
    });
    
    // Cleanup function
    return () => {
      abortController.abort();
      window.cancelIdleCallback(idleId);
    };
  }, [currentGuess, onComplete, onMapGuess]);
  
  /**
   * Prepare image data for the hint system
   * This ensures all required properties are present and properly formatted
   */
  const memoizedImageData = useMemo(() => {
    if (!image) {
      console.warn('No image data available for hints');
      return undefined;
    }
    
    try {
      return {
        ...image,
        // Ensure all required GameImage properties are included
        gps: { 
          lat: image.latitude || 0, 
          lng: image.longitude || 0 
        },
        // These properties are already in the GameImage type
        latitude: image.latitude || 0,
        longitude: image.longitude || 0,
        image_url: image.image_url || '', // Fallback to image_url if available
        url: image.image_url || '', // Ensure url is always set
        description: image.description || '',
        title: image.title || 'Untitled',
        location_name: image.location_name || 'Unknown location',
        year: image.year || new Date().getFullYear()
      };
    } catch (error) {
      console.error('Error preparing image data for hints:', error);
      return undefined;
    }
  }, [image]);

  // Use the new hint system with proper cleanup
  const { selectedHintType, hintContent, canSelectHint, selectHint, resetHint } = useHint(memoizedImageData);
  
  // Cleanup hint resources when component unmounts or image changes
  useEffect(() => {
    return () => {
      // Reset any hint-related states when unmounting or when image changes
      // This prevents memory leaks and ensures clean state for the next round
      if (selectedHintType) {
        resetHint();
      }
    };
  }, [memoizedImageData, selectedHintType, resetHint]);

  const handleHintClick = useCallback(() => {
    // Early return if no hints can be selected
    if (!canSelectHint) {
      console.warn('Cannot select hint: no hints available or already selected');
      return;
    }
    
    // Ensure we have valid image data before showing the hint modal
    if (!image) {
      console.error('Cannot show hint modal: no image data available');
      return;
    }
    
    // Track the hint request for analytics (optional)
    console.log(`Hint requested for image: ${image.id || 'unknown'}`);
    
    // Open the hint modal
    setIsHintModalOpen(true);
  }, [canSelectHint, image]);

  const handleCoordinatesSelect = useCallback((lat: number, lng: number) => {
    const newGuess = { lat, lng };
    setCurrentGuess(newGuess);
    onMapGuess(lat, lng);
    console.log("Map coordinates selected:", lat, lng);
  }, [onMapGuess]);

  /**
   * Handles the submission of the user's guess
   * Includes error boundaries, loading states, and proper cleanup
   */
  const handleSubmit = useCallback(async () => {
    // Early return if required dependencies are missing or already submitting
    if (!onComplete || !currentGuess || isSubmitting) {
      console.warn('Submit prevented:', { onComplete: !!onComplete, currentGuess, isSubmitting });
      return;
    }
    
    // Create an AbortController to handle cleanup
    const abortController = new AbortController();
    const { signal } = abortController as { signal: AbortSignal };
    
    // Track if the component is still mounted
    let isMounted = true;
    
    
    // Function to safely update state if component is still mounted
    const safeSetState = (updater: () => void) => {
      if (!signal.aborted && isMounted) {
        updater();
      }
    };
    
    try {
      // Update loading state
      safeSetState(() => setIsSubmitting(true));
      
      // Log the submission attempt (useful for debugging)
      console.log('Submitting guess:', { lat: currentGuess.lat, lng: currentGuess.lng });
      
      // Execute the onComplete callback
      await onComplete();
      
      // Log successful submission
      console.log('Guess submitted successfully');
      
    } catch (error) {
      // Only handle errors if the component is still mounted and the operation wasn't aborted
      if (!signal.aborted && isMounted) {
        console.error('Error submitting guess:', isError(error) ? error.message : 'Unknown error');
        
        // Consider showing an error toast to the user
        // You can uncomment and customize this if you have a toast system
        // toast.error({
        //   title: 'Submission Error',
        //   description: 'Failed to submit your guess. Please try again.',
        //   variant: 'destructive',
        // });
      }
    } finally {
      // Always clean up the loading state if the component is still mounted
      safeSetState(() => setIsSubmitting(false));
    }
    
    // Cleanup function to run when the effect is cleaned up
    return () => {
      // Mark as unmounted to prevent state updates
      isMounted = false;
      
      // Abort any ongoing operations
      if (!signal.aborted) {
        abortController.abort();
      }
    };
  }, [onComplete, currentGuess, isSubmitting]);

  if (!image) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-history-light dark:bg-history-dark">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-red-500 mb-4">Failed to load round data</h2>
          <p className="mb-4">Image data for round {currentRound} is missing.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-history-light dark:bg-history-dark">
      <div className="w-full h-[40vh] md:h-[50vh] relative">
        <img
          src={image.image_url}
          alt={image.title}
          className="w-full h-full object-cover"
        />
        <div className={`hud-element ${isFullScreen ? 'hidden' : ''}`}>
          <GameOverlayHUD 
            selectedHintType={selectedHintType}
            remainingTime={formatTime(remainingTime)}
            rawRemainingTime={remainingTime}
            onHintClick={handleHintClick}
            hintsUsed={hintsUsedThisRound || 0}
            hintsAllowed={HINTS_PER_GAME}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
            onNavigateHome={onNavigateHome}
            onConfirmNavigation={onConfirmNavigation}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            imageUrl={image.image_url}
            onFullscreen={handleFullscreen}
            isTimerActive={isTimerActive}
            onTimeout={handleTimeout}
            setRemainingTime={setRemainingTime}
          />
        </div>
      </div>
      
      {/* Full screen image overlay */}
      {isFullScreen && (
        <FullscreenZoomableImage
          image={{ url: image.image_url, title: image.title }}
          onExit={() => {
            if (document.exitFullscreen) document.exitFullscreen();
            setIsFullScreen(false);
          }}
        />
      )}

      <div className="flex-grow p-4 md:p-8">
        <div className="max-w-5xl mx-auto">
          <YearSelector 
            selectedYear={selectedYear}
            onChange={onYearChange}
          />
          
          <LocationSelector 
            selectedLocation={null}
            onLocationSelect={() => {}}
            onCoordinatesSelect={handleCoordinatesSelect}
          />
          
          {/* Submit Button */}
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSubmit}
              disabled={!currentGuess || isSubmitting}
              className={`px-6 py-3 rounded-full font-medium text-white transition-colors flex items-center justify-center min-w-[140px] ${
                currentGuess && !isSubmitting
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : 'Submit Guess'}
            </button>
          </div>
        </div>
      </div>

      <HintModal
        isOpen={isHintModalOpen}
        onOpenChange={setIsHintModalOpen}
        onSelectHint={selectHint}
        selectedHintType={selectedHintType}
        hintContent={hintContent || ''}
        hintsUsedThisRound={hintsUsedThisRound}
        hintsUsedTotal={hintsUsedTotal}
        HINTS_PER_ROUND={HINTS_PER_GAME}
        HINTS_PER_GAME={HINTS_PER_GAME}
        image={{ url: image.image_url, title: image.title }}
      />

      <GlobalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {children}
    </div>
  );
};

export default GameLayout1;
