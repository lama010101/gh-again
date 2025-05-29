import { useState, useEffect, useCallback } from 'react';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { GameImage, RoundResult } from '@/contexts/GameContext'; // Assuming these types are exported from GameContext

interface GameState {
  gameId: string | null;
  roomId: string | null;
  images: GameImage[];
  roundResults: RoundResult[];
  isLoading: boolean;
  error: string | null;
  hintsAllowed: number;
  roundTimerSec: number;
  totalGameAccuracy: number;
  totalGameXP: number;
}

interface UseGameStateReturn extends GameState {
  setGameId: (id: string | null) => void;
  setRoomId: (id: string | null) => void;
  setImages: (images: GameImage[]) => void;
  setRoundResults: React.Dispatch<React.SetStateAction<RoundResult[]>>;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHintsAllowed: (hints: number) => void;
  setRoundTimerSec: (seconds: number) => void;
  setTotalGameAccuracy: (accuracy: number) => void;
  setTotalGameXP: (xp: number) => void;
  resetGameState: () => void;
  clearSavedGameState: () => void;
}

export const useGameState = (): UseGameStateReturn => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hintsAllowed, setHintsAllowed] = useState<number>(3);
  const { timerSeconds, setTimerSeconds } = useSettingsStore();
  const [roundTimerSec, setRoundTimerSec] = useState<number>(timerSeconds || 60);
  const [totalGameAccuracy, setTotalGameAccuracy] = useState<number>(0);
  const [totalGameXP, setTotalGameXP] = useState<number>(0);

  // Keep roundTimerSec in sync with timerSeconds from settings store
  useEffect(() => {
    setRoundTimerSec(timerSeconds);
  }, [timerSeconds]);

  // Unified setter for both context and settings store
  const handleSetRoundTimerSec = useCallback((seconds: number) => {
    setRoundTimerSec(seconds);
    setTimerSeconds(seconds);
  }, [setTimerSeconds]);

  // Save game state to localStorage whenever it changes
  useEffect(() => {
    if (roomId && images.length > 0) {
      const gameState = {
        roomId,
        images,
        roundResults,
        hintsAllowed,
        roundTimerSec,
        totalGameAccuracy,
        totalGameXP,
        timestamp: Date.now()
      };
      localStorage.setItem('gh_current_game', JSON.stringify(gameState));
    }
  }, [roomId, images, roundResults, hintsAllowed, roundTimerSec, totalGameAccuracy, totalGameXP]);

  // Load game state from localStorage on mount
  useEffect(() => {
    const loadGameState = () => {
      try {
        const savedGame = localStorage.getItem('gh_current_game');
        if (savedGame) {
          const gameState = JSON.parse(savedGame);
          
          // Only load if the saved game is less than 24 hours old
          const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
          if (Date.now() - (gameState.timestamp || 0) < TWENTY_FOUR_HOURS) {
            setRoomId(gameState.roomId);
            setImages(gameState.images || []);
            setRoundResults(gameState.roundResults || []);
            setHintsAllowed(gameState.hintsAllowed || 3);
            setRoundTimerSec(gameState.roundTimerSec || 60);
            setTotalGameAccuracy(gameState.totalGameAccuracy || 0);
            setTotalGameXP(gameState.totalGameXP || 0);
            console.log('Loaded saved game state:', gameState);
          } else {
            // Clear old game state
            localStorage.removeItem('gh_current_game');
          }
        }
      } catch (error) {
        console.error('Error loading game state:', error);
        localStorage.removeItem('gh_current_game');
      }
    };

    loadGameState();
  }, []);

  // Clear saved game state
  const clearSavedGameState = useCallback(() => {
    localStorage.removeItem('gh_current_game');
  }, []);

  const resetGameState = useCallback(() => {
    setGameId(null);
    setRoomId(null);
    setImages([]);
    setRoundResults([]);
    setIsLoading(false);
    setError(null);
    setHintsAllowed(3);
    setRoundTimerSec(timerSeconds || 60);
    setTotalGameAccuracy(0);
    setTotalGameXP(0);
    clearSavedGameState();
  }, [timerSeconds, clearSavedGameState]);

  return {
    gameId,
    roomId,
    images,
    roundResults,
    isLoading,
    error,
    hintsAllowed,
    roundTimerSec,
    totalGameAccuracy,
    totalGameXP,
    setGameId,
    setRoomId,
    setImages,
    setRoundResults,
    setIsLoading,
    setError,
    setHintsAllowed,
    setRoundTimerSec: handleSetRoundTimerSec, // Use the unified setter
    setTotalGameAccuracy,
    setTotalGameXP,
    resetGameState,
    clearSavedGameState,
  };
};
