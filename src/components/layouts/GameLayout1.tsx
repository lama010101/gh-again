import React, { useState, useCallback } from 'react';
import { Progress } from "@/components/ui/progress";
import { useHint } from '@/hooks/useHint';
import HintModal from '@/components/HintModal';
import Popup from '@/components/ui/Popup';
import GameSettings from '@/components/game/GameSettings';

// Import refactored components
import GameOverlayHUD from '@/components/navigation/GameOverlayHUD';
import YearSelector from '@/components/game/YearSelector';
import LocationSelector from '@/components/game/LocationSelector';
import TimerDisplay, { formatTime } from '@/components/game/TimerDisplay';
import { GameImage, GuessCoordinates } from '@/contexts/GameContext'; // Import necessary types
import { useGame } from '@/contexts/GameContext'; // Import useGame

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
  const [isHintModalOpen, setIsHintModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { hintsAllowed, totalGameAccuracy, totalGameXP, roundTimerSec } = useGame();
  
  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);
  
  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);
  
  const {
    selectedHintType,
    hintContent,
    selectHint,
    hintsUsed,
    canSelectHint,
    canSelectHintType
  } = useHint(image ? {
    location_name: image.location_name,
    gps: { lat: image.latitude, lng: image.longitude },
    year: image.year,
    title: image.title,
    description: image.description
  } : undefined);

  const handleHintClick = () => {
    if (canSelectHint) {
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
        <GameOverlayHUD 
          selectedHintType={selectedHintType}
          remainingTime={isTimerActive ? formatTime(remainingTime) : formatTime(0)}
          rawRemainingTime={isTimerActive ? remainingTime : 0}
          onHintClick={handleHintClick}
          hintsUsed={hintsUsed || 0}
          hintsAllowed={hintsAllowed}
          currentAccuracy={totalGameAccuracy}
          currentScore={totalGameXP}
          onSettingsClick={handleSettingsClick}
          onNavigateHome={onNavigateHome}
          onConfirmNavigation={onConfirmNavigation}
        />
        {/* Timer Display */}
        <div className="absolute bottom-4 right-4 z-50">
          <TimerDisplay 
            remainingTime={remainingTime} 
            setRemainingTime={setRemainingTime}
            isActive={isTimerActive}
            onTimeout={onComplete}
            roundTimerSec={roundTimerSec}
          />
        </div>
      </div>
      
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
        selectedHintType={selectedHintType}
        hintContent={hintContent}
        onSelectHint={selectHint}
      />
      
      {/* Settings Popup */}
      <Popup 
        isOpen={isSettingsOpen} 
        onClose={handleSettingsClose}
        ariaLabelledBy="game-settings-title"
      >
        <div className="w-full max-w-md p-6">
          <h2 id="game-settings-title" className="text-2xl font-bold mb-6 text-white text-center">
            Game Settings
          </h2>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
            <GameSettings />
            <div className="mt-6 flex justify-end">
              <button
                onClick={handleSettingsClose}
                className="px-4 py-2 bg-history-primary text-white rounded-lg hover:bg-history-primary/90 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default GameLayout1;
