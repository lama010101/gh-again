import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { GameImage, RoundResult } from './GameContext';

// Types for our context state
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

interface GameActions {
  setGameId: (id: string | null) => void;
  setRoomId: (id: string | null) => void;
  setImages: (images: GameImage[]) => void;
  setRoundResults: React.Dispatch<React.SetStateAction<RoundResult[]>>;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setHintsAllowed: (hints: number) => void;
  setRoundTimerSec: (seconds: number) => void;
  startGame: (settings?: { timerSeconds?: number; hintsPerGame?: number }, existingGameId?: string) => Promise<void>;
  recordRoundResult: (result: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number, currentRoundImage: GameImage) => void;
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>;
  refreshGlobalMetrics: () => void;
}

// Create separate contexts for state and actions
const GameStateContext = createContext<GameState | undefined>(undefined);
const GameActionsContext = createContext<GameActions | undefined>(undefined);

// Custom hook for consuming state
const useGameState = () => {
  const context = useContext(GameStateContext);
  if (context === undefined) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};

// Custom hook for consuming actions
const useGameActions = () => {
  const context = useContext(GameActionsContext);
  if (context === undefined) {
    throw new Error('useGameActions must be used within a GameProvider');
  }
  return context;
};

export { GameStateContext, GameActionsContext, useGameState, useGameActions };

export type { GameState, GameActions };
