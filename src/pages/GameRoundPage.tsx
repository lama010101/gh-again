import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback, useMemo } from 'react';
import GameLayout1 from "@/components/layouts/GameLayout1";
import { Loader, MapPin } from "lucide-react";
import { useGameState, useGameActions } from '@/contexts/GameContext'; // Keep for startGame, etc.
import { useToast } from '@/components/ui/use-toast';
// GuessCoordinates will come from @/types/game via useGameRound
// Calculation utils will be used within useGameRound
import SegmentedProgressBar from '@/components/ui/segmented-progress-bar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
import { useHint } from '@/hooks/useHint'; // HINT_PENALTY is used in useGameRound
import { useGameRound } from '@/hooks/useGameRound';
import { useGameTimer } from '@/hooks/useGameTimer';

interface GameRoundPageProps {
  mode?: 'solo' | 'multi';
}

const ROUNDS_PER_GAME = 5; 
const ROUND_TIME_SECONDS = 60; 

const GameRoundPage: React.FC<GameRoundPageProps> = ({ mode: initialMode = 'solo' }) => {
  const navigate = useNavigate();
  const { roundNumber: roundNumberStr, roomId: paramRoomId } = useParams<{ 
    roundNumber?: string; 
    roomId?: string 
  }>();

  const { toast } = useToast();
  const { startGame, fetchGlobalMetrics, refreshGlobalMetrics } = useGameActions();
  const { 
    isLoading: isContextLoading, 
    error: contextError, 
    roundTimerSec, 
    hintsAllowed, 
    totalGameAccuracy, 
    totalGameXP, 
    gameId 
  } = useGameState();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const effectiveRoomId = paramRoomId || gameId;

  const [isRoundTimerActive, setIsRoundTimerActive] = useState(true);
  const {
    currentGuess,
    selectedYear,
    isSubmitting,
    // isTimerActive is now managed locally as isRoundTimerActive
    hintsUsedThisRound, // This will be reset by useGameRound internally
    imageForRound,
    currentRoundIndex,
    tooltipOpen,
    hasGuessedLocation, // Needed for GameLayout1
    handleMapClick,
    handleYearSelect,
    handleUseHint,
    handleSubmitGuess,
  } = useGameRound({
    roundNumber,
    effectiveRoomId
  });

  const [gameMode, setGameMode] = useState<'solo' | 'multi'>(initialMode);
  const { 
    remainingTime,
    setRemainingTime, // GameLayout1 expects this, so let's get it from useGameTimer
    hasTimedOut,
    // setHasTimedOut, // Not directly set from here anymore, reset via resetTimer
    resetTimer, // Get resetTimer from useGameTimer
  } = useGameTimer({
    initialTime: roundTimerSec || ROUND_TIME_SECONDS,
    onTimeout: () => handleSubmitGuess(0), // Pass 0 as remainingTime on timeout
    isActive: isRoundTimerActive
  });

  const { 
    selectedHintType, 
    hintContent, 
    canSelectHint, 
    selectHint, 
    resetHint 
  } = useHint(imageForRound ? {
    ...imageForRound,
    gps: { lat: imageForRound.latitude, lng: imageForRound.longitude },
    url: imageForRound.image_url
  } : undefined);

  const [isHintModalOpen, setIsHintModalOpen] = useState(false);

  const handleActualHintClick = () => {
    if (!canSelectHint) {
      console.warn('Cannot select hint: no hints available or already selected');
      return;
    }
    if (!imageForRound) {
      console.error('Cannot show hint modal: no image data available');
      return;
    }
    setIsHintModalOpen(true);
  };

  useEffect(() => {
    if (isContextLoading) return;

    if (contextError) {
      toast({
        title: "Game Loading Error",
        description: `Error loading game: ${contextError}`,
        variant: "destructive",
      });
      navigate('/test');
      return;
    }

    // If gameId is provided in URL params but not in context, it means a new game needs to be started or joined
    if (paramRoomId && !gameId) {
      // This scenario should ideally be handled by GameRoomPage or a dedicated game starting flow
      // For now, we'll just redirect to home if no game context is found for a given roomId
      toast({
        title: "Game Session Error",
        description: "Invalid game session. Please start a new game.",
        variant: "destructive",
      });
      navigate('/test');
      return;
    }

    // If it's the first round and game hasn't started, start it
    if (roundNumber === 1 && !gameId) {
      startGame(initialMode, paramRoomId);
    }

    // Reset hints used for the new round - This is now handled by useGameRound's internal useEffect
    // setHintsUsedThisRound(0);

    // Reset timer for the new round
    resetTimer(); // Reset timer using the function from useGameTimer
    setIsRoundTimerActive(true); // Start the timer for the new round
    // setHasTimedOut(false); // Handled by resetTimer
    // setHasGuessedLocation(false); // Handled by useGameRound
    // setCurrentGuess(null); // Handled by useGameRound
    // setSelectedYear(new Date().getFullYear()); // Handled by useGameRound

  }, [roundNumber, gameId, startGame, initialMode, paramRoomId, isContextLoading, contextError, roundTimerSec, navigate, toast, resetTimer]);

  // Confirm navigation dialog
  const [showConfirmNavigation, setShowConfirmNavigation] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const handleConfirmNavigation = useCallback((confirm: boolean) => {
    setShowConfirmNavigation(false);
    if (confirm && pendingNavigation) {
      pendingNavigation();
    }
    setPendingNavigation(null);
  }, [pendingNavigation]);

  // Intercept navigation attempts if game is active
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (gameId && roundNumber <= ROUNDS_PER_GAME && !isSubmitting) {
        event.preventDefault();
        event.returnValue = ''; 
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [gameId, roundNumber, isSubmitting]);

  // Effect to stop timer when submitting
  useEffect(() => {
    if (isSubmitting) {
      setIsRoundTimerActive(false);
    }
  }, [isSubmitting]);

  // Loading state
  if (isContextLoading || !imageForRound) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <Loader className="h-12 w-12 animate-spin text-history-primary" />
        <p className="text-lg text-gray-700 dark:text-gray-300 mt-4">Loading game round...</p>
      </div>
    );
  }

  // Error state
  if (contextError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <MapPin className="h-12 w-12 text-red-500" />
        <p className="text-lg text-red-700 dark:text-red-300 mt-4">Error: {contextError.message}</p>
        <Button onClick={() => navigate('/test')} className="mt-4">Go to Home</Button>
      </div>
    );
  }

  return (
    <GameLayout1
      onComplete={() => handleSubmitGuess(remainingTime)}
      gameMode={gameMode}
      currentRound={roundNumber}
      totalRounds={ROUNDS_PER_GAME}
      image={imageForRound}
      initialGuess={currentGuess} // Changed from currentGuess to initialGuess
      selectedYear={selectedYear}
      onMapGuess={handleMapClick} // Changed from onMapClick to onMapGuess
      onYearChange={handleYearSelect} // Prop name matches
      remainingTime={remainingTime}
      setRemainingTime={setRemainingTime} // Pass setRemainingTime from useGameTimer
      isTimerActive={isRoundTimerActive} // Pass local isRoundTimerActive state
      onNavigateHome={() => navigate('/test')} // Basic navigation handler
      onConfirmNavigation={(navigateTo) => { // Basic confirm navigation handler
        setPendingNavigation(() => navigateTo);
        setShowConfirmNavigation(true);
      }}
      totalGameAccuracy={totalGameAccuracy}
      totalGameXP={totalGameXP}
      // hintsUsedThisRound, hintsUsedTotal, HINTS_PER_GAME are not directly available here in the same way GameLayout1 expects.
      // GameLayout1's internal hint logic might conflict or need adjustment.
      // For now, passing what's available from useGameRound for hintsUsedThisRound.
      hintsUsedThisRound={hintsUsedThisRound} 
      hintsUsedTotal={0} // Placeholder - GameContext/useGameRound doesn't track total across game for layout
      HINTS_PER_GAME={hintsAllowed || 3} // Use context hintsAllowed
      // Removed props not in GameLayout1Props: isSubmitting, hasTimedOut, hasGuessedLocation, tooltipOpen, gameId
      // Props like onUseHint, onHintModalOpen etc. are for GameRoundPage's own HintModal, not GameLayout1's internal one.
    >
      <></>
      {/* Passed empty fragment for required children prop as GameLayout1 renders its main content internally */}
    </GameLayout1>
  );
};

export default GameRoundPage;