import React, { useState, useCallback, useEffect, useMemo, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { v4 as uuidv4 } from 'uuid'; // For generating unique game IDs
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import type { Database } from '@/types/supabase'; // Assuming this path, adjust if necessary
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

// Helper function to map Supabase image data to GameImage type
const mapSupabaseImageToGameImage = (dbImage: any): GameImage => ({
    id: dbImage.id,
    title: dbImage.title || '',
    description: dbImage.description || '',
    latitude: dbImage.latitude,
    longitude: dbImage.longitude,
    year: dbImage.year,
    image_url: dbImage.image_url,
    location_name: dbImage.location_name || '',
});

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

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<GameErrorType | null>(null);
  const [hintsAllowed, setHintsAllowed] = useState<number>(3); // Default from GameSettings or a constant
  const { timerSeconds: settingsTimerSeconds, setTimerSeconds, hintsPerGame: globalHintsPerGame } = useSettingsStore();
  const [roundTimerSec, setRoundTimerSec] = useState<number>(settingsTimerSeconds || 60); // Default from GameSettings or a constant
  const [totalGameAccuracy, setTotalGameAccuracy] = useState<number>(0);
  const [totalGameXP, setTotalGameXP] = useState<number>(0);

  const navigate = useNavigate();
  const supabase = useSupabaseClient<Database>(); // Typed Supabase client

  // --- Helper Functions ---
  const handleError = useCallback((error: unknown, defaultMessage: string): GameErrorType => {
    console.error(`[GameContext] Error: ${defaultMessage}`, error);
    // Assuming GameError, NetworkError, PersistenceError are custom classes available in the scope
    // If they are simple objects or not custom classes, this check might need adjustment.
    if (error && typeof error === 'object' && 'name' in error && 'message' in error && 
        (error.name === 'GameError' || error.name === 'NetworkError' || error.name === 'PersistenceError')) {
      return { code: error.name as GameErrorType['code'], message: String(error.message) };
    }
    if (error instanceof Error) {
      return { code: 'UNKNOWN_ERROR', message: error.message };
    }
    return { code: 'UNKNOWN_ERROR', message: defaultMessage };
  }, []);

  const mapSupabaseImageToGameImage = (dbImage: any): GameImage => ({
    id: dbImage.id_v2 || dbImage.id, // Prefer id_v2 if exists, fallback to id
    image_url: dbImage.image_url, // Align with GameImage type from @/types/game and validateGameImage
    latitude: dbImage.latitude,
    longitude: dbImage.longitude,
    year: dbImage.year, // Changed from actualYear, assuming GameImage type expects 'year'
    title: dbImage.title, // Added based on lint error aee8e161-498e-45e9-8d09-6abdc22c4944
    description: dbImage.description, // Added based on lint error aee8e161-498e-45e9-8d09-6abdc22c4944
    location_name: dbImage.location_name, // Added based on lint error aee8e161-498e-45e9-8d09-6abdc22c4944
    // region: dbImage.region, // Assuming GameImage type does not define these
    // country: dbImage.country, // Assuming GameImage type does not define these
  });

  const saveGameState = useCallback((gameState: PersistedGameState) => {
    try {
      localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(gameState));
      console.log('[GameContext] Game state saved to local storage:', gameState);
    } catch (e) {
      console.error('[GameContext] Failed to save game state to local storage:', e);
    }
  }, []);

  const clearSavedGameState = useCallback(() => {
    try {
      localStorage.removeItem(GAME_STORAGE_KEY);
      console.log('[GameContext] Cleared game state from local storage.');
    } catch (e) {
      console.error('[GameContext] Failed to clear game state from local storage:', e);
    }
  }, []);

  const applyGlobalDefaultSettings = useCallback(() => {
    const defaultTimer = settingsTimerSeconds ?? 60;
    const defaultHints = globalHintsPerGame ?? 3;
    setRoundTimerSec(defaultTimer);
    setHintsAllowed(defaultHints);
    console.log(`[GameContext] Applied global default settings: Timer ${defaultTimer}s, Hints ${defaultHints}`);
  }, [settingsTimerSeconds, globalHintsPerGame, setRoundTimerSec, setHintsAllowed]);


  // Apply game-specific settings, potentially overriding global settings
  const applyGameSettings = useCallback((settings?: { timerSeconds?: number; hintsPerGame?: number }) => {
    if (settings) {
      if (typeof settings.timerSeconds === 'number' && settings.timerSeconds >= 0) {
        setRoundTimerSec(settings.timerSeconds);
      }
      if (typeof settings.hintsPerGame === 'number' && settings.hintsPerGame >= 0) {
        setHintsAllowed(settings.hintsPerGame);
      }
    }
  }, []);

  // Sync roundTimerSec with settingsTimerSeconds from settings store when not in an active game
  useEffect(() => {
    if (!gameId) { // Only sync if no active game is overriding settings
        setRoundTimerSec(settingsTimerSeconds);
    }
  }, [settingsTimerSeconds, gameId]);

  // Unified setter for the global timer preference in settings store
  const handleSetGlobalRoundTimerSec = useCallback((seconds: number) => {
    setTimerSeconds(seconds); // Update global setting in store
    if (!gameId) { // If not in a game, also update local roundTimerSec for immediate UI feedback
        setRoundTimerSec(seconds);
    }
  }, [setTimerSeconds, gameId]);

  // Save game state when it changes (excluding sensitive or large objects if necessary)
  useEffect(() => {
    if (gameId && !gameId.startsWith('solo_')) { // Persist only for multiplayer games
      persistGameState({
        gameId,
        roomId,
        images, // Consider if images need to be persisted or re-fetched
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
        if (savedState && savedState.gameId && !savedState.gameId.startsWith('solo_')) {
          setGameId(savedState.gameId);
          setRoomId(savedState.roomId);
          setImages(savedState.images); // Consider re-fetching if images are large/dynamic
          setRoundResults(savedState.roundResults);
          applyGameSettings({ hintsPerGame: savedState.hintsAllowed, timerSeconds: savedState.roundTimerSec });
          setTotalGameAccuracy(savedState.totalGameAccuracy);
          setTotalGameXP(savedState.totalGameXP);
        }
      } catch (err) {
        setError(handleError(err, 'Failed to load previous game state'));
      }
    };
    loadGameState();
  }, []);

  const fetchGlobalMetrics = useCallback(async () => {
    console.log(`[GameContext] Fetching global metrics... Current Game ID: ${gameId || 'N/A'}`);
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error('[GameContext] Error fetching authenticated user for metrics:', authError);
      }
      
      let currentUserId = authUser?.id;

      if (!currentUserId) {
        const guestSession = localStorage.getItem('guestSession');
        if (guestSession) {
          try {
            const guestUser = JSON.parse(guestSession) as { id?: string };
            if (guestUser.id) {
              currentUserId = guestUser.id;
              console.log(`[GameContext] Identified guest user for metrics: ${currentUserId}`);
            }
          } catch (parseError) {
            console.error('[GameContext] Error parsing guest session for metrics:', parseError);
          }
        }
      }

      if (currentUserId) {
        console.log(`[GameContext] Fetching metrics for user ID: ${currentUserId}`);
        const { data, error: fetchError } = await supabase
          .from('user_metrics')
          .select('overall_accuracy, xp_total')
          .eq('user_id', currentUserId)
          .maybeSingle();

        if (fetchError && fetchError.code !== 'PGRST116') { 
          console.error(`[GameContext] Error fetching user metrics for ${currentUserId}:`, fetchError);
          setTotalGameAccuracy(0);
          setTotalGameXP(0);
        } else if (data) {
          setTotalGameAccuracy(data.overall_accuracy || 0);
          setTotalGameXP(data.xp_total || 0);
          console.log(`[GameContext] Metrics loaded for user ${currentUserId}: Acc ${data.overall_accuracy || 0}, XP ${data.xp_total || 0}`);
        } else { 
          console.log(`[GameContext] No metrics found for user ${currentUserId}. Creating initial entry.`);
          const { error: insertError } = await supabase
            .from('user_metrics')
            .insert({ user_id: currentUserId, overall_accuracy: 0, xp_total: 0, games_played: 0 });
          if (insertError) {
            console.error(`[GameContext] Error creating metrics for ${currentUserId}:`, insertError);
          }
          setTotalGameAccuracy(0);
          setTotalGameXP(0);
        }
      } else {
        console.log('[GameContext] No user ID (authenticated or guest) found. Unable to fetch/create metrics.');
        setTotalGameAccuracy(0);
        setTotalGameXP(0);
      }
    } catch (err) {
      console.error('Unexpected error in fetchGlobalMetrics:', err);
      setError(handleError(err, 'An unexpected error occurred while fetching global metrics'));
      setTotalGameAccuracy(0);
      setTotalGameXP(0);
    }
  }, [gameId, supabase, setTotalGameAccuracy, setTotalGameXP, setError, handleError]);

  const refreshGlobalMetrics = useCallback(async () => {
    await fetchGlobalMetrics();
  }, [fetchGlobalMetrics]);

  const startGame = useCallback(async (
    mode: 'solo' | 'multi',
    existingGameId?: string,
    initialSettings?: Partial<GameSettings> // Used if creating a game with specific settings (e.g. from a lobby)
  ) => {
    console.log(`[GameContext] startGame called. Mode: ${mode}, ExistingGameId: ${existingGameId}, InitialSettings:`, initialSettings);
    setIsLoading(true);
    setError(null);
    setRoundResults([]);
    // setTotalGameAccuracy(0); // Metrics are fetched/reset by fetchGlobalMetrics
    // setTotalGameXP(0);

    // Determine initial game settings
    const gameInitialTimer = initialSettings?.timerSeconds ?? settingsTimerSeconds ?? 60;
    const gameInitialHints = initialSettings?.hintsPerGame ?? globalHintsPerGame ?? 3;
    const numberOfImagesPerGame = 5; // Standard number of images

    let gameConfigForState: {
      id: string;
      images: GameImage[];
      settings: GameSettings;
    } | null = null;

    try {
      if (existingGameId) {
        // --- JOINING AN EXISTING MULTIPLAYER GAME ---
        console.log(`[GameContext] Attempting to join existing game: ${existingGameId}`);
        const { data: gameRecord, error: gameFetchError } = await supabase
          .from('games')
          .select('id, image_ids, timer_seconds, hints_per_game')
          .eq('id', existingGameId)
          .single();

        if (gameFetchError) throw handleError(gameFetchError, `Failed to fetch game data for ${existingGameId}`);
        if (!gameRecord) throw new GameError(`Game with ID ${existingGameId} not found.`);
        if (!gameRecord.image_ids || gameRecord.image_ids.length !== numberOfImagesPerGame) {
          throw new GameError(`Game ${existingGameId} has invalid image_ids (count: ${gameRecord.image_ids?.length}, expected: ${numberOfImagesPerGame}).`);
        }

        const { data: fetchedImagesData, error: imagesFetchError } = await supabase
          .from('images')
          .select('*')
          .in('id', gameRecord.image_ids);

        if (imagesFetchError) throw handleError(imagesFetchError, `Failed to fetch images for game ${existingGameId}`);
        if (!fetchedImagesData || fetchedImagesData.length !== gameRecord.image_ids.length) {
          throw new GameError('Could not fetch all required images for the game.');
        }

        const orderedImages = gameRecord.image_ids.map(id => 
          fetchedImagesData.find(img => img.id === id)
        ).filter(Boolean).map(img => mapSupabaseImageToGameImage(img as any)); // Added 'as any' to bypass strict type check if mapSupabaseImageToGameImage expects specific supabase types

        if (orderedImages.length !== gameRecord.image_ids.length) {
          throw new GameError('Image data mismatch after ordering for existing game.');
        }
        
        gameConfigForState = {
          id: gameRecord.id,
          images: orderedImages,
          settings: {
            timerSeconds: gameRecord.timer_seconds ?? gameInitialTimer,
            hintsPerGame: gameRecord.hints_per_game ?? gameInitialHints,
          },
        };
        console.log(`[GameContext] Successfully loaded data for existing game ${existingGameId}:`, gameConfigForState);

      } else {
        // --- CREATING A NEW GAME (SOLO OR MULTIPLAYER) ---
        console.log(`[GameContext] Creating new ${mode} game with settings: Timer=${gameInitialTimer}s, Hints=${gameInitialHints}`);
        const { data: randomImagesRaw, error: rpcError } = await supabase
          .rpc('get_random_game_images', { p_image_count: numberOfImagesPerGame });

        if (rpcError) throw handleError(rpcError, 'Failed to fetch random images via RPC');
        if (!randomImagesRaw || randomImagesRaw.length < numberOfImagesPerGame) {
          throw new GameError(`Not enough random images returned (${randomImagesRaw?.length}/${numberOfImagesPerGame}).`);
        }

        const selectedImages = randomImagesRaw.map(img => mapSupabaseImageToGameImage(img as any));
        const selectedImageIds = selectedImages.map(img => img.id);

        if (mode === 'multi') {
          const { data: createdGameData, error: gameCreationError } = await supabase
            .from('games')
            .insert({
              image_ids: selectedImageIds,
              timer_seconds: gameInitialTimer,
              hints_per_game: gameInitialHints,
              mode: 'multi',
              round_count: numberOfImagesPerGame, // Assuming round_count is number of images
              // current_round: 1, // Let DB default or handle this if necessary
              // created_by_user_id: (await supabase.auth.getUser()).data.user?.id // Optional: track creator
            })
            .select('id, timer_seconds, hints_per_game')
            .single();

          if (gameCreationError) throw handleError(gameCreationError, 'Failed to create multiplayer game in DB');
          if (!createdGameData) throw new GameError('Multiplayer game created but no data returned.');

          gameConfigForState = {
            id: createdGameData.id,
            images: selectedImages,
            settings: {
              timerSeconds: createdGameData.timer_seconds ?? gameInitialTimer,
              hintsPerGame: createdGameData.hints_per_game ?? gameInitialHints,
            }
          };
          console.log(`[GameContext] New multiplayer game created with ID: ${createdGameData.id}`, gameConfigForState);
        } else { // mode === 'solo'
          const tempGameId = `solo_${uuidv4()}`;
          gameConfigForState = {
            id: tempGameId,
            images: selectedImages,
            settings: { timerSeconds: gameInitialTimer, hintsPerGame: gameInitialHints },
          };
          console.log(`[GameContext] New temporary solo game created with ID: ${tempGameId}`, gameConfigForState);
        }
      }

      if (!gameConfigForState) {
        throw new GameError('Game configuration could not be established.');
      }

      // Apply the determined game configuration to the context state
      setGameId(gameConfigForState.id);
      setRoomId(gameConfigForState.id); // For multi, roomId is gameId. For solo, it's the tempGameId.
      setImages(gameConfigForState.images);
      applyGameSettings(gameConfigForState.settings); // This updates roundTimerSec and hintsAllowed
      
      // Persist game state to local storage
      saveGameState({
        gameId: gameConfigForState.id,
        roomId: gameConfigForState.id,
        images: gameConfigForState.images,
        roundResults: [], // Fresh game, no results yet
        // currentRoundIndex: 0, // Removed as PersistedGameState may not define it
        // settings: gameConfigForState.settings, // Removed as PersistedGameState may not define it directly
        // Instead, map relevant settings properties to PersistedGameState properties:
        roundTimerSec: gameConfigForState.settings.timerSeconds,
        hintsAllowed: gameConfigForState.settings.hintsPerGame,
        totalGameAccuracy: 0, // Added based on lint error fd945272-52e6-4b15-b89e-33538b0931e2
        totalGameXP: 0, // Added based on lint error fd945272-52e6-4b15-b89e-33538b0931e2
      });

      console.log(`[GameContext] Game successfully initialized and state set. Game ID: ${gameConfigForState.id}, Images: ${gameConfigForState.images.length}, Timer: ${gameConfigForState.settings.timerSeconds}s, Hints: ${gameConfigForState.settings.hintsPerGame}`);
      navigate(`/game/${gameConfigForState.id}`);

    } catch (err: unknown) {
      const gameError = handleError(err, 'An error occurred while starting the game');
      console.error('[GameContext] Error in startGame:', gameError);
      setError(gameError);
      setGameId(null);
      setRoomId(null);
      setImages([]);
      // Potentially reset to global defaults if a game fails to start
      applyGlobalDefaultSettings(); 
    } finally {
      setIsLoading(false);
    }
  }, [supabase, navigate, settingsTimerSeconds, globalHintsPerGame, setIsLoading, setError, setRoundResults, setGameId, setRoomId, setImages, applyGameSettings, saveGameState, handleError, applyGlobalDefaultSettings]);

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
    // Reset to global/default settings when a game is reset
    setHintsAllowed(3); // Default or from settings store if you have one for hints
    setRoundTimerSec(settingsTimerSeconds || 60);
    setTotalGameAccuracy(0);
    setTotalGameXP(0);
    clearSavedGameState();
  }, [clearSavedGameState, settingsTimerSeconds, globalHintsPerGame]); // Added globalHintsPerGame to dependency array if it's used in reset defaults




  // --- CONTEXT VALUES ---
  const stateValue = useMemo<GameState>(() => ({
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
  }), [
    gameId, roomId, images, roundResults, isLoading, error,
    hintsAllowed, roundTimerSec, totalGameAccuracy, totalGameXP,
  ]);

  const actionsValue = useMemo<GameActions>(() => ({
    setGameId,
    setRoomId,
    setImages,
    setRoundResults,
    setIsLoading,
    setError,
    setHintsAllowed,
    setRoundTimerSec, // This now correctly refers to the local state setter for the current game round's timer
    setTotalGameAccuracy,
    setTotalGameXP,
    startGame,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    refreshGlobalMetrics,
    applyGameSettings,
    applyGlobalDefaultSettings,
    clearSavedGameState,
    // If you want to expose the function to set global timer preference, add it here with a clear name
    // e.g., setGlobalUserTimerPreference: handleSetGlobalRoundTimerSec,
  }), [
    setGameId, setRoomId, setImages, setRoundResults, setIsLoading, setError,
    setHintsAllowed, setRoundTimerSec, setTotalGameAccuracy, setTotalGameXP,
    startGame, recordRoundResult, resetGame, fetchGlobalMetrics, refreshGlobalMetrics,
    applyGameSettings, applyGlobalDefaultSettings, clearSavedGameState, handleSetGlobalRoundTimerSec // Added handleSetGlobalRoundTimerSec to deps
  ]);

  return (
    <GameStateContext.Provider value={stateValue}>
      <GameActionsContext.Provider value={actionsValue}>
        {children}
      </GameActionsContext.Provider>
    </GameStateContext.Provider>
  );
};

// Error classes are now exported at their definition.
