import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui/use-toast';
import { useGameState, useGameActions } from '@/contexts/GameContext';
import { GuessCoordinates, GameImage } from '@/types/game';
import { calculateLocationXP, calculateTimeXP } from '@/utils/gameCalculations';
import {
  KM_CONVERSION_FACTOR,
  MAX_SCORE_PER_ROUND,
  DEFAULT_ROUND_TIME_SECONDS,
  DEFAULT_HINTS_PER_GAME,
  ROUNDS_PER_GAME
} from '@/constants/game';
import { HINT_PENALTY } from '@/hooks/useHint';

interface UseGameRoundOptions {
  roundNumber: number;
  effectiveRoomId: string | null;
}

interface UseGameRoundReturn {
  // Round state
  currentGuess: GuessCoordinates | null;
  selectedYear: number;
  isSubmitting: boolean;
  hasGuessedLocation: boolean;
  hintsUsedThisRound: number;
  imageForRound: GameImage | undefined;
  currentRoundIndex: number;
  tooltipOpen: boolean | undefined;
  
  // Actions
  handleMapClick: (lat: number, lng: number) => void;
  handleYearSelect: (year: number) => void;
  handleUseHint: () => void;
  handleSubmitGuess: (remainingTimeInRound: number) => Promise<void>;
  // Timer control will be handled by GameRoundPage via isRoundTimerActive prop to useGameTimer
}

export function useGameRound({
  roundNumber,
  effectiveRoomId
}: UseGameRoundOptions): UseGameRoundReturn {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentRoundIndex = roundNumber - 1;
  
  // Game state from context
  const { 
    images,
    isLoading: isContextLoading, 
    error: contextError, 
    roundTimerSec,
    hintsAllowed,
    totalGameAccuracy,
    totalGameXP,
    gameId
  } = useGameState();
  
  const { 
    recordRoundResult,
    setHintsAllowed,
    setRoundTimerSec,
  } = useGameActions();

  // Local component state
  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isSubmitting, setIsSubmitting] = useState(false);
  // isTimerActive, hasTimedOut, remainingTime are now managed by useGameTimer / GameRoundPage
  const [hasGuessedLocation, setHasGuessedLocation] = useState(false);
  const [hintsUsedThisRound, setHintsUsedThisRound] = useState(0);
  
  // Get the image for this round
  const imageForRound = useMemo(() => images[currentRoundIndex], [images, currentRoundIndex]);

  // Effect to reset round-specific state when roundNumber changes or new image loads
  useEffect(() => {
    setCurrentGuess(null);
    setSelectedYear(new Date().getFullYear());
    setHasGuessedLocation(false);
    setHintsUsedThisRound(0);
    // isSubmitting is reset at the end of handleSubmitGuess or on error
  }, [roundNumber, imageForRound]); // Reset when roundNumber or the specific image for the round changes
  
  // Handle error if no image found after context loads
  useEffect(() => {
    if (!isContextLoading && !imageForRound && !contextError && gameId) { // Only if game is supposed to be active
      toast({
        title: "Game Error",
        description: "Game data not found for this round. Attempting to redirect...",
        variant: "destructive",
      });
      navigate('/test'); // Redirect to home or game start page
    }
  }, [isContextLoading, imageForRound, contextError, navigate, toast, gameId]);
  
  // Handle map click for guessing location
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const newGuess: GuessCoordinates = { lat, lng };
    setCurrentGuess(newGuess);
    setHasGuessedLocation(true);
  }, []);
  
  // Handle year selection
  const handleYearSelect = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);
  
  // Handle hint usage
  const handleUseHint = useCallback(() => {
    if (hintsUsedThisRound < (hintsAllowed || DEFAULT_HINTS_PER_GAME)) {
      setHintsUsedThisRound(prev => prev + 1);
    }
  }, [hintsUsedThisRound, hintsAllowed]);
  
  // Memoize the tooltip open state
  const tooltipOpen = useMemo(() => {
    return !hasGuessedLocation ? undefined : false;
  }, [hasGuessedLocation]);

  // Handle guess submission 
  const handleSubmitGuess = useCallback(async (remainingTimeInRound: number) => {
    if (isSubmitting || !imageForRound) return;
    
    setIsSubmitting(true);
    // setIsTimerActive(false); // This will be handled by GameRoundPage based on isSubmitting

    try {
      // If no guess was made, submit a default guess at 0,0
      const guessToUse = currentGuess || { lat: 0, lng: 0 };
      
      // Calculate distance if we have a valid guess
      
      // Calculate the location-based XP (0-1000)
      const locationXP = calculateLocationXP(guessToUse ? 
        Math.sqrt(
          Math.pow(guessToUse.lat - imageForRound.latitude, 2) + 
          Math.pow(guessToUse.lng - imageForRound.longitude, 2)
        ) * KM_CONVERSION_FACTOR : 10000);

      // Calculate the time-based XP (0-1000)
      const timeXP = calculateTimeXP(selectedYear, imageForRound.year);

      // Calculate hint penalty (10% per hint used)
      const hintPenalty = hintsUsedThisRound * HINT_PENALTY; 

      // Calculate final score (location + time - hint penalty, min 0)
      const finalScore = Math.max(0, locationXP + timeXP - hintPenalty);
      
      // Calculate round percentage (0-100%)
      const roundPercent = Math.round((finalScore / MAX_SCORE_PER_ROUND) * 100);

      // Distance calculation
      const distance = Math.sqrt(
        Math.pow(guessToUse.lat - imageForRound.latitude, 2) + 
        Math.pow(guessToUse.lng - imageForRound.longitude, 2)
      ) * KM_CONVERSION_FACTOR; // Rough approximation

      console.log(`Distance: ${distance?.toFixed(2) ?? 'N/A'} km, ` +
        `Location XP: ${locationXP.toFixed(1)}, ` +
        `Time XP: ${timeXP.toFixed(1)}, ` +
        `Hint Penalty: -${hintPenalty}, ` +
        `Round XP: ${finalScore.toFixed(1)}, ` +
        `Accuracy: ${roundPercent}%, ` +
        `Hints Used: ${hintsUsedThisRound}`);

      const timeTakenSeconds = (roundTimerSec || DEFAULT_ROUND_TIME_SECONDS) - remainingTimeInRound;

      // Record the round result
      const success = await recordRoundResult({
        roundIndex: currentRoundIndex,
        imageId: imageForRound.id,
        guessCoordinates: guessToUse,
        actualCoordinates: { lat: imageForRound.latitude, lng: imageForRound.longitude },
        distanceKm: distance,
        score: finalScore, // Overall score for the round (location + time - hints)
        guessYear: selectedYear,
        xpWhere: locationXP, // Location XP
        xpWhen: timeXP,    // Time XP (using xpWhen from RoundResult type)
        accuracy: roundPercent, // Overall accuracy percentage for the round
        timeTakenSeconds: timeTakenSeconds,
        hintsUsed: hintsUsedThisRound
      });

      if (!success) {
        toast({
          title: "Submission Error",
          description: "Failed to record round result. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false); 
        return;
      }

      // Navigate to results page
      navigate(`/test/game/room/${effectiveRoomId}/round/${roundNumber}/results`);
    } catch (error) {
      console.error("Error submitting guess:", error);
      toast({
        title: "Submission Error",
        description: "An error occurred while submitting your guess. Please try again.",
        variant: "destructive",
      });
      setIsSubmitting(false); 
    }
  }, [
    isSubmitting, 
    currentGuess, 
    selectedYear, 
    imageForRound, 
    hintsUsedThisRound, 
    gameId, 
    currentRoundIndex, 
    recordRoundResult, 
    toast,
    navigate,
    roundNumber,
    effectiveRoomId,
    roundTimerSec // For timeTakenSeconds calculation
  ]);
  
  return {
    // State
    currentGuess,
    selectedYear,
    isSubmitting,
    hasGuessedLocation,
    hintsUsedThisRound,
    imageForRound,
    currentRoundIndex,
    tooltipOpen,
    // Actions
    handleMapClick,
    handleYearSelect,
    handleUseHint,
    handleSubmitGuess
  };
}
