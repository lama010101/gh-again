import { Database } from '@/types/supabase';
import {
  GameSettings,
  GuessCoordinates,
  RoundResult,
  GameImage,
  PersistedGameState,
  GameErrorType
} from '@/types/game';

// Define the context state shapes
export interface GameState {
  gameId: string | null;
  roomId: string | null;
  images: GameImage[];
  roundResults: RoundResult[];
  isLoading: boolean;
  error: GameErrorType | null;
  hintsAllowed: number;
  roundTimerSec: number;
  totalGameAccuracy: number;
  totalGameXP: number;
}

// Define the context actions shapes
export interface GameStateSetterActions {
  setGameId: (id: string | null) => void;
  setRoomId: (id: string | null) => void;
  setImages: (images: GameImage[]) => void;
  setRoundResults: (results: RoundResult[]) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: GameErrorType | null) => void;
  setHintsAllowed: (hints: number) => void;
  setRoundTimerSec: (seconds: number) => void;
  setTotalGameAccuracy: (accuracy: number) => void;
  setTotalGameXP: (xp: number) => void;
}

export interface GameControlActions {
  startGame: (mode: 'solo' | 'multi', existingGameId?: string, initialSettings?: Partial<GameSettings>) => Promise<void>;
  recordRoundResult: (result: Omit<RoundResult, 'imageId' | 'actualCoordinates' | 'roundIndex' | 'timestamp'> & {
    roundIndex: number;
    imageId: string;
    actualCoordinates: { lat: number; lng: number };
  }) => Promise<boolean>;
  resetGame: () => void;
}

export interface GameMetricsActions {
  fetchGlobalMetrics: () => Promise<void>;
  refreshGlobalMetrics: () => Promise<void>;
}

// Combine action interfaces
export type GameActions = GameStateSetterActions & GameControlActions & GameMetricsActions;

// Complete context type
export interface GameContextType extends GameState, GameActions {
  // Any additional properties that don't fit the categories above
}
