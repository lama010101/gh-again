import React, { useState, useCallback, useEffect, useMemo, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { v4 as uuidv4 } from 'uuid'; // For generating unique game IDs
import { 
  GameSettings, 
  GuessCoordinates, 
  RoundResult, 
  GameImage, 
  PersistedGameState,
  GameErrorType
} from '@/types/game';
import {
  MIN_LATITUDE,
  MAX_LATITUDE,
  MIN_LONGITUDE,
  MAX_LONGITUDE,
  MIN_YEAR,
  MAX_YEAR,
  GAME_STORAGE_KEY
} from '@/constants/game';

// Validation functions for GameSettings
export const validateGameSettings = (settings: GameSettings): boolean => {
  return settings.timerSeconds >= 0 && settings.hintsPerGame >= 0;
};

// Validation function for coordinates
export const validateCoordinates = (coords: GuessCoordinates): boolean => {
  return coords.lat >= MIN_LATITUDE && coords.lat <= MAX_LATITUDE && 
         coords.lng >= MIN_LONGITUDE && coords.lng <= MAX_LONGITUDE;
};

// Validation function for RoundResult
export const validateRoundResult = (result: RoundResult): boolean => {
  return (
    result.roundIndex >= 0 &&
    result.imageId.length > 0 &&
    (result.guessCoordinates === null || validateCoordinates(result.guessCoordinates)) &&
    validateCoordinates(result.actualCoordinates) &&
    (result.distanceKm === null || result.distanceKm >= 0) &&
    (result.score === null || (result.score >= 0 && result.score <= 100)) &&
    (result.guessYear === null || (result.guessYear >= MIN_YEAR && result.guessYear <= MAX_YEAR)) &&
    result.xpWhere >= 0 && result.xpWhere <= 100 &&
    result.xpWhen >= 0 && result.xpWhen <= 100 &&
    result.accuracy >= 0 && result.accuracy <= 100 &&
    result.hintsUsed >= 0
  );
};

// Validation function for GameImage
export const validateGameImage = (image: GameImage): boolean => {
  const urlPattern = /^https?:\/\/.+/i;

  return (
    image.id.length > 0 &&
    image.title.length > 0 &&
    image.description.length > 0 &&
    image.latitude >= MIN_LATITUDE && image.latitude <= MAX_LATITUDE &&
    image.longitude >= MIN_LONGITUDE && image.longitude <= MAX_LONGITUDE &&
    image.year >= MIN_YEAR && image.year <= MAX_YEAR &&
    urlPattern.test(image.image_url) &&
    image.location_name.length > 0
  );
};

// State persistence utilities

/**
 * Persists game state to localStorage
 * @param state - The game state to persist
 */
const persistGameState = (state: PersistedGameState): void => {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist game state:', error);
  }
};

/**
 * Loads persisted game state from localStorage
 * @returns The persisted game state or null if not found/invalid
 */
const loadPersistedState = (): PersistedGameState | null => {
  try {
    const savedState = localStorage.getItem(GAME_STORAGE_KEY);
    if (!savedState) return null;
    
    const parsedState = JSON.parse(savedState) as PersistedGameState;
    if (!validatePersistedState(parsedState)) {
      throw new Error('Invalid persisted state');
    }
    return parsedState;
  } catch (error) {
    console.error('Failed to load persisted state:', error);
    localStorage.removeItem(GAME_STORAGE_KEY);
    return null;
  }
};

/**
 * Type guard to validate persisted state
 * @param state - The state to validate
 * @returns Boolean indicating if state is valid
 */
const validatePersistedState = (state: unknown): state is PersistedGameState => {
  const s = state as PersistedGameState;
  return (
    typeof s === 'object' &&
    s !== null &&
    typeof s.gameId === 'string' &&
    (s.roomId === null || typeof s.roomId === 'string') &&
    Array.isArray(s.images) &&
    s.images.every(validateGameImage) &&
    Array.isArray(s.roundResults) &&
    s.roundResults.every(validateRoundResult) &&
    typeof s.hintsAllowed === 'number' &&
    typeof s.roundTimerSec === 'number' &&
    typeof s.totalGameAccuracy === 'number' &&
    typeof s.totalGameXP === 'number'
  );
};

// Error handling utilities
/**
 * Creates a standardized error object
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns GameErrorType object
 */
const createError = (code: string, message: string, details?: unknown): GameErrorType => ({
  code,
  message,
  details
});

/**
 * Handles unknown errors and converts them to GameErrorType
 * @param error - The error to handle
 * @param defaultMessage - Default message if error has no message
 * @returns GameErrorType object
 */
const handleError = (error: unknown, defaultMessage: string): GameErrorType => {
  if (error instanceof Error) {
    return createError('UNKNOWN_ERROR', error.message || defaultMessage);
  }
  return createError('UNKNOWN_ERROR', defaultMessage);
};

// Custom error classes for better error handling
export class GameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GameError';
  }
}

export class ValidationError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class PersistenceError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'PersistenceError';
  }
}

// Define the context state shape
interface GameState {
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

// Define the context actions shape
interface GameActions {
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
  startGame: (mode: 'solo' | 'multi', existingGameId?: string) => Promise<void>;
  recordRoundResult: (result: Omit<RoundResult, 'imageId' | 'actualCoordinates' | 'roundIndex'> & { 
    roundIndex: number, 
    imageId: string, 
    actualCoordinates: { lat: number; lng: number } 
  }) => Promise<boolean>;
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>;
  refreshGlobalMetrics: () => Promise<void>;
}

// Create the contexts
const GameStateContext = createContext<GameState | undefined>(undefined);
const GameActionsContext = createContext<GameActions | undefined>(undefined);

// Custom hooks to use the contexts
export const useGameState = () => {
  const context = useContext(GameStateContext);
  if (!context) {
    throw new Error('useGameState must be used within a GameProvider');
  }
  return context;
};

export const useGameActions = () => {
  const context = useContext(GameActionsContext);
  if (!context) {
    throw new Error('useGameActions must be used within a GameProvider');
  }
  return context;
};

// Combined hook for convenience
export const useGame = () => {
  const state = useGameState();
  const actions = useGameActions();
  return { ...state, ...actions };
};

// --- PROVIDER ---
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // State variables
  const [gameId, setGameId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<GameErrorType | null>(null);
  const [hintsAllowed, setHintsAllowed] = useState<number>(3); // Default 3 hints per game
  // Get timer setting from settings store (defaults to 60 seconds)
  const { timerSeconds, setTimerSeconds } = useSettingsStore();
  const [roundTimerSec, setRoundTimerSec] = useState<number>(timerSeconds || 60);
  const [totalGameAccuracy, setTotalGameAccuracy] = useState<number>(0);
  const [totalGameXP, setTotalGameXP] = useState<number>(0);

  const navigate = useNavigate();

  // Keep roundTimerSec in sync with timerSeconds from settings store
  useEffect(() => {
    setRoundTimerSec(timerSeconds);
  }, [timerSeconds]);

  // Accept settings from startGame
  const applyGameSettings = (settings?: { timerSeconds?: number; hintsPerGame?: number }) => {
    if (settings) {
      if (typeof settings.timerSeconds === 'number') setRoundTimerSec(settings.timerSeconds);
      if (typeof settings.hintsPerGame === 'number') setHintsAllowed(settings.hintsPerGame);
    }
  };

  // Unified setter for both context and settings store
  const handleSetRoundTimerSec = useCallback((seconds: number) => {
    setRoundTimerSec(seconds);
    setTimerSeconds(seconds);
  }, [setTimerSeconds]);

  // Save game state when it changes
  useEffect(() => {
    if (gameId) {
      persistGameState({
        gameId,
        roomId,
        images,
        roundResults,
        hintsAllowed,
        roundTimerSec,
        totalGameAccuracy,
        totalGameXP
      });
    }
  }, [gameId, roomId, images, roundResults, hintsAllowed, roundTimerSec, totalGameAccuracy, totalGameXP]);

  // Load game state from localStorage on mount
  useEffect(() => {
    const loadGameState = () => {
      try {
        const savedState = loadPersistedState();
        if (savedState) {
          setGameId(savedState.gameId);
          setRoomId(savedState.roomId);
          setImages(savedState.images);
          setRoundResults(savedState.roundResults);
          setHintsAllowed(savedState.hintsAllowed);
          setRoundTimerSec(savedState.roundTimerSec);
          setTotalGameAccuracy(savedState.totalGameAccuracy);
          setTotalGameXP(savedState.totalGameXP);
        }
      } catch (error) {
        setError(handleError(error, 'Failed to load previous game state'));
      }
    };

    loadGameState();
  }, []);

  // Clear saved game state when component unmounts or game is reset
  const clearSavedGameState = useCallback(() => {
    localStorage.removeItem('gh_current_game');
  }, []);

  // Function to fetch global metrics from Supabase or localStorage
  const fetchGlobalMetrics = useCallback(async () => {
    try {
      console.log('Fetching global metrics...');
      // First check for guest session in localStorage
      const guestSession = localStorage.getItem('guestSession');
      if (guestSession) {
        try {
          const guestUser = JSON.parse(guestSession);
          const storageKey = `guest_metrics_${guestUser.id}`;
          const storedMetrics = localStorage.getItem(storageKey);
          
          if (storedMetrics) {
            const metrics = JSON.parse(storedMetrics);
            // Ensure we have valid numbers
            const accuracyValue = typeof metrics.overall_accuracy === 'number' ? metrics.overall_accuracy : 0;
            const xpValue = typeof metrics.xp_total === 'number' ? metrics.xp_total : 0;
            
            // Set state with verified numeric values
            console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Updating global metrics for guest user:`, {

              newAccuracy: accuracyValue,

              newXP: xpValue,
              source: 'guest-local-storage',
              timestamp: new Date().toISOString()
            });
            
            return;
          } else {
            console.log('No guest metrics found in local storage.');
          }
        } catch (parseError) {
          console.error('Error parsing guest session or metrics from localStorage:', parseError);
          setError({ code: 'PARSE_ERROR', message: 'Failed to parse guest session data' });
        }
      }

      // If no guest session or metrics, try fetching from Supabase for authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Error fetching authenticated user:', authError);
        setError({ code: 'AUTH_ERROR', message: 'Failed to fetch authenticated user for metrics' });
        return;
      }

      if (user) {
        const { data, error: fetchError } = await supabase
          .from('user_metrics')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (fetchError) {
          console.error('Error fetching user metrics from Supabase:', fetchError);
          setError({ code: 'METRICS_ERROR', message: 'Failed to fetch user metrics', details: fetchError.message });
          return;
        }

        if (data) {
          setTotalGameAccuracy(data.overall_accuracy || 0);
          setTotalGameXP(data.xp_total || 0);
          console.log(`[GameContext] [GameID: ${gameId || 'N/A'}] Loaded global metrics for registered user:`, data);
        }
      } else {
        console.log('No authenticated user found for metrics.');
      }
    } catch (err) {
      console.error('Unexpected error in fetchGlobalMetrics:', err);
      setError({ code: 'METRICS_ERROR', message: 'An unexpected error occurred while fetching global metrics' });
    }
  }, [gameId]);

  // Refresh global metrics (e.g., after a game ends)
  const refreshGlobalMetrics = useCallback(async () => {
    await fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  // Function to start a new game
  const startGame = useCallback(async (mode: 'solo' | 'multi', existingGameId?: string) => {
    setIsLoading(true);
    setError(null);
    setRoundResults([]); // Clear previous round results
    setTotalGameAccuracy(0);
    setTotalGameXP(0);

    try {
      let newGameId = existingGameId;
      let newRoomId = existingGameId;

      if (!newGameId) {
        // Generate a new game ID if not provided (for solo games)
        newGameId = `temp_${uuidv4()}`;
        newRoomId = newGameId; // For solo games, roomId is the same as gameId
      }

      // Fetch images for the game
      const { data: imagesData, error: imagesError } = await supabase
        .from('images')
        .select('*')
        .limit(5); // Fetch 5 images for the game

      if (imagesError) {
        throw new Error(`Failed to fetch game images: ${imagesError.message}`);
      }
      if (!imagesData || imagesData.length === 0) {
        throw new Error('No images found to start the game.');
      }

      const gameImages: GameImage[] = imagesData.map(img => ({
        id: img.id,
        title: img.title,
        description: img.description,
        latitude: img.latitude,
        longitude: img.longitude,
        year: img.year,
        image_url: img.image_url,
        location_name: img.location_name,
      }));

      setImages(gameImages);
      setGameId(newGameId);
      setRoomId(newRoomId);

      // If it's a multi-player game or a registered game, create an entry in the 'games' table
      if (mode === 'multi' || !newGameId.startsWith('temp_')) {
        const { data: gameData, error: gameCreationError } = await supabase
          .from('games')
          .insert({
            current_round: 1,
            round_count: 5,
            mode: mode,
          })
          .select()
          .single();

        if (gameCreationError) {
          throw new Error(`Failed to create game entry: ${gameCreationError.message}`);
        }
        console.log('Game created in DB:', gameData);
      }

      console.log(`Game started with ID: ${newGameId}, Room ID: ${newRoomId}`);
    } catch (err: any) {
      console.error('Error starting game:', err);
      setError({ code: 'GAME_START_ERROR', message: err.message || 'Failed to start game' });
      setGameId(null);
      setRoomId(null);
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const recordRoundResult = useCallback(async (roundData: Omit<RoundResult, 'imageId' | 'actualCoordinates' | 'roundIndex' | 'timeTakenSeconds'> & { roundIndex: number; imageId: string; actualCoordinates: { lat: number; lng: number; }; timeTakenSeconds: number; }) => {
    if (!gameId) {
      console.error('Cannot record round result: Game not initialized');
      setError({ code: 'GAME_STATE_ERROR', message: 'Cannot record round result: Game not initialized' });
      return false;
    }

    const newResult: RoundResult = {
      ...roundData,
      imageId: roundData.imageId,
      actualCoordinates: roundData.actualCoordinates,
      roundIndex: roundData.roundIndex,
      timeTakenSeconds: roundData.timeTakenSeconds,
    };

    setRoundResults(prevResults => [...prevResults, newResult]);

    // Update total game accuracy and XP
    setTotalGameAccuracy(prev => prev + (newResult.accuracy || 0));
    setTotalGameXP(prev => prev + (newResult.score || 0));

    // If it's a temporary game, store results in session storage
    if (gameId.startsWith('temp_')) {
      const tempGameResults = JSON.parse(sessionStorage.getItem(`temp_game_${gameId}_results`) || '[]');
      tempGameResults.push(newResult);
      sessionStorage.setItem(`temp_game_${gameId}_results`, JSON.stringify(tempGameResults));
      return true;
    } else {
      // For registered games, save to Supabase
      try {
        const { error: insertError } = await supabase
          .from('game_rounds')
          .insert({
            game_id: gameId,
            round_index: newResult.roundIndex,
            image_id: newResult.imageId,
            guess_coordinates: newResult.guessCoordinates,
            actual_coordinates: newResult.actualCoordinates,
            distance_km: newResult.distanceKm,
            score: newResult.score,
            guess_year: newResult.guessYear,
            xp_where: newResult.xpWhere,
            xp_when: newResult.xpWhen,
            accuracy: newResult.accuracy,
            hints_used: newResult.hintsUsed,
            time_taken_seconds: newResult.timeTakenSeconds
          });

        if (insertError) {
          console.error('Error inserting round result into Supabase:', insertError);
          setError({ code: 'GAME_ERROR', message: `Failed to save round result: ${insertError.message}` });
          return false;
        }
        console.log('Round result saved to Supabase:', newResult);
        return true;
      } catch (err: any) {
        console.error('Unexpected error saving round result:', err);
        setError({ code: 'GAME_ERROR', message: err.message || 'Failed to save round result' });
        return false;
      }
    }
  }, [gameId, setRoundResults, setTotalGameAccuracy, setTotalGameXP]);

  const resetGame = useCallback(() => {
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
  }, [clearSavedGameState, timerSeconds]);

  // --- CONTEXT VALUES ---
  // Memoize state context value
  const stateValue = useMemo(() => ({
    gameId,
    roomId,
    images,
    roundResults,
    isLoading,
    error,
    hintsAllowed,
    roundTimerSec,
    totalGameAccuracy,
    totalGameXP
  }), [
    gameId,
    roomId,
    images,
    roundResults,
    isLoading,
    error,
    hintsAllowed,
    roundTimerSec,
    totalGameAccuracy,
    totalGameXP
  ]);

  // Memoize actions context value
  const actionsValue = useMemo(() => ({
    setGameId,
    setRoomId,
    setImages,
    setRoundResults,
    setIsLoading,
    setError,
    setHintsAllowed,
    setRoundTimerSec: handleSetRoundTimerSec,
    setTotalGameAccuracy,
    setTotalGameXP,
    startGame,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    refreshGlobalMetrics
  }), [
    handleSetRoundTimerSec,
    startGame,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    refreshGlobalMetrics
  ]);

  return (
    <GameStateContext.Provider value={stateValue}>
      <GameActionsContext.Provider value={actionsValue}>
        {children}
      </GameActionsContext.Provider>
    </GameStateContext.Provider>
  );
};
