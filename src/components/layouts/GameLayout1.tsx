import React, { useState, useEffect, useCallback, useMemo } from 'react';
import GlobalSettingsModal from '@/components/settings/GlobalSettingsModal'; // Import the global settings modal
import { useHint, type HintType } from '@/hooks/useHint';
import HintModal from '@/components/HintModal';
import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import TimerDisplay, { formatTime } from '@/components/game/TimerDisplay';
import { GameImage, GuessCoordinates, useGame } from '@/contexts/GameContext';

export interface GameLayout1Props {
  onComplete?: () => void;
  gameMode?: string;
  currentRound?: number;
  image: GameImage | null;
  onMapGuess: (lat: number, lng: number) => void;
  initialGuess?: GuessCoordinates | null;
  selectedYear: number;
  onYearChange: (year: number) => void;
  remainingTime: number;
  setRemainingTime: React.Dispatch<React.SetStateAction<number>>;
  isTimerActive: boolean;
  onNavigateHome: () => void;
  onConfirmNavigation: (navigateTo: () => void) => void;
}

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
}) => {
  const [isFullScreen, setIsFullScreen] = useState(false);

  const handleFullscreen = () => {
    setIsFullScreen(true);
    setTimeout(() => {
      const el = document.getElementById('game-fullscreen-img');
      if (el && el.requestFullscreen) el.requestFullscreen();
    }, 0);
  };

  // Exit full screen on escape or fullscreenchange
  useEffect(() => {
    const exitHandler = () => {
      if (!document.fullscreenElement) setIsFullScreen(false);
    };
    document.addEventListener('fullscreenchange', exitHandler);
    return () => document.removeEventListener('fullscreenchange', exitHandler);
  }, []);
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { hintsAllowed, totalGameAccuracy, totalGameXP, roundTimerSec } = useGame();
  
  // Handle timer timeout
  const handleTimeout = () => {
    if (onComplete) {
      onComplete();
    }
  };
  
  // Initialize hint-related variables with default values
  const [hintState, setHintState] = useState<{
    selectedHintType: HintType;
    hintContent: string | null;
    hintsUsed: number;
    canSelectHint: boolean;
    selectHint: (hintType: HintType) => void;
  }>({
    selectedHintType: null,
    hintContent: null,
    hintsUsed: 0,
    canSelectHint: false,
    selectHint: () => {}
  });

  // Memoize the imageData object passed to useHint
  const memoizedImageData = useMemo(() => {
    if (!image) return undefined;
    return {
      location_name: image.location_name,
      gps: { lat: image.latitude, lng: image.longitude },
      year: image.year,
      title: image.title,
      description: image.description
    };
  }, [image]); // Dependency: only recompute if the image prop itself changes

  // Destructure properties from useHint directly, passing memoizedImageData
  const {
    selectedHintType: hookSelectedHintType,
    hintContent: hookHintContent,
    hintsUsed: hookHintsUsed,
    canSelectHint: hookCanSelectHint,
    selectHint: hookSelectHint
  } = useHint(memoizedImageData) || {}; // Pass memoizedImageData

  // Update hint state when hook returns data
  useEffect(() => {
    // Ensure the hook has provided its functions/data before trying to set state
    // We can check for hookSelectHint as it's a function that should be present if the hook is active
    if (hookSelectHint !== undefined) {
      setHintState(prevState => {
        const newSelectedHintType = hookSelectedHintType ?? null;
        const newHintContent = hookHintContent ?? null;

        // Only update state if the values have actually changed
        if (
          prevState.selectedHintType !== newSelectedHintType ||
          prevState.hintContent !== newHintContent ||
          prevState.hintsUsed !== hookHintsUsed ||
          prevState.canSelectHint !== hookCanSelectHint ||
          prevState.selectHint !== hookSelectHint // Relies on hookSelectHint being a stable reference
        ) {
          return {
            selectedHintType: newSelectedHintType,
            hintContent: newHintContent,
            hintsUsed: hookHintsUsed,
            canSelectHint: hookCanSelectHint,
            selectHint: hookSelectHint,
          };
        }
        return prevState; // No change, return previous state to avoid re-render
      });
    }
  }, [hookSelectedHintType, hookHintContent, hookHintsUsed, hookCanSelectHint, hookSelectHint]); // Depend on individual, stable values

  // Destructure the state for easier use
  const { selectedHintType, hintContent, hintsUsed, canSelectHint, selectHint } = hintState;



  const handleHintClick = () => {
    if (hintState.canSelectHint) {
      setIsHintModalOpen(true);
    } else {
      console.log("Cannot select hint now.");
    }
  };

  const handleCoordinatesSelect = (lat: number, lng: number) => {
    onMapGuess(lat, lng);
    console.log("Map coordinates selected:", lat, lng);
  };

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
          src={image.url}
          alt={image.title}
          className="w-full h-full object-cover"
        />
        <div className={`hud-element ${isFullScreen ? 'hidden' : ''}`}>
          <GameOverlayHUD 
            selectedHintType={selectedHintType}
            remainingTime={isTimerActive ? formatTime(remainingTime) : formatTime(0)}
            rawRemainingTime={isTimerActive ? remainingTime : 0}
            onHintClick={handleHintClick}
            hintsUsed={hintsUsed || 0}
            hintsAllowed={hintsAllowed}
            currentAccuracy={totalGameAccuracy}
            currentScore={totalGameXP}
            onNavigateHome={onNavigateHome}
            onConfirmNavigation={onConfirmNavigation}
            onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
            imageUrl={image.url}
            onFullscreen={handleFullscreen}
          />
        </div>
      </div>
      
      {/* Full screen image overlay */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center">
          <img
            id="game-fullscreen-img"
            src={image.url}
            alt={image.title}
            className="max-w-full max-h-full object-contain"
            style={{ background: 'black' }}
          />
          
          {/* Fullscreen exit button */}
          <button 
            onClick={() => {
              if (document.exitFullscreen) {
                document.exitFullscreen();
              }
              setIsFullScreen(false);
            }}
            className="fixed top-4 right-4 z-[10000] p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
            aria-label="Exit fullscreen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
            </svg>
          </button>
        </div>
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
        </div>
      </div>

      <HintModal
        isOpen={isHintModalOpen}
        onOpenChange={setIsHintModalOpen}
        onSelectHint={selectHint}
        selectedHintType={selectedHintType}
        hintContent={hintContent}
      />

      <GlobalSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export default GameLayout1;
