import { useReducer, createContext, useContext, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
// import { useSupabaseClient } from '@supabase/auth-helpers-react'; // Replaced
import { supabase } from '@/integrations/supabase/client'; // Added
import { Database } from '../../types/supabase';

// Import types
import { GameImage, RoundResult, GameErrorType, GameSettings, GuessCoordinates } from '../../types/game'; // Added GuessCoordinates
import { useSettingsStore } from '../../lib/useSettingsStore';

// Import action types and creators
import { GameState } from './actionTypes'; // GameActionTypes is implicitly used by reducer
import {
  setGameId,
  setRoomId,
  setImages,
  setRoundResults,
  setIsLoading,
  setError,
  setHintsAllowed,
  setRoundTimerSec,
  setTotalGameAccuracy,
  setTotalGameXP,
  resetGame as resetGameAction
} from './actionCreators';

// Import utilities
import { loadPersistedState, persistGameState, clearSavedGameState } from './storage';
import { handleError, createError } from './errors'; // Added createError
import { DEFAULT_IMAGES_PER_GAME } from './constants'; // Assuming this file exists and is correct
import {
  calculateDistance,
  calculateAccuracy,
  calculateScore,
  calculateXPEarned
} from './gameUtils';

// Import the reducer and initial state
import { gameReducer, initialGameState } from './reducer';

// Define GameContextType
type GameContextType = GameState & {
  currentImage: GameImage | null;
  currentRoundIndex: number;
  startGame: (existingGameId?: string, initialSettings?: Partial<GameSettings>) => Promise<void>;
  completeRound: (result: {
    guessCoordinates: GuessCoordinates | null;
    guessYear: number | null;
    hintsUsed: number;
    timeTakenSeconds: number;
  }) => Promise<void>;
  recordRoundResult: (roundResultData: RoundResult) => Promise<boolean>;
  resetGame: () => void;
  fetchGlobalMetrics: () => Promise<void>;
  updateSettings: (settings: Partial<GameSettings>) => void;
  completeGame: () => Promise<void>;
};

// Create and export the context
export const GameContext = createContext<GameContextType | null>(null);

// Action creators are imported directly and used with dispatch, e.g., dispatch(setGameId(payload))
// No need for gameActionCreators or local aliasing like setGameIdAction here.

/**
 * Helper function to map Supabase image data to GameImage type
 * @param dbImage - Image data from database
 * @returns Formatted GameImage object
 */
const mapSupabaseImageToGameImage = (dbImage: any): GameImage => ({
  id: dbImage.id,
  image_url: dbImage.image_url || dbImage.url || '', // Prefer image_url, fallback to url
  title: dbImage.title || 'Untitled',
  description: dbImage.description || '',
  latitude: dbImage.latitude || 0,
  longitude: dbImage.longitude || 0,
  year: dbImage.year || new Date().getFullYear(),
  location_name: dbImage.location_name || '', // Added location_name
});

/**
 * Game provider component
 */
export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  // const supabaseClient = useSupabaseClient<Database>(); // Replaced
  const supabaseClient = supabase; // Use direct import
  // const session = supabaseClient.auth.getSession(); // Removed, will fetch session async where needed

  const settingsTimerSeconds = useSettingsStore((state) => state.timerSeconds);
  const globalHintsPerGame = useSettingsStore((state) => state.hintsPerGame);

  const [state, dispatch] = useReducer(gameReducer, initialGameState);

  // Destructure state for easier access
  const {
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
  } = state;

  // Calculate the current round index and current image
  const currentRoundIndex = roundResults.length;
  const currentImage = images && images.length > currentRoundIndex ? images[currentRoundIndex] : null;

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    if (newSettings.timerSeconds !== undefined) {
      dispatch(setRoundTimerSec(newSettings.timerSeconds));
    }
    if (newSettings.hintsPerGame !== undefined) {
      dispatch(setHintsAllowed(newSettings.hintsPerGame));
    }
  }, [dispatch]);

  // Apply global default settings
  const applyGlobalDefaultSettings = useCallback(() => {
    dispatch(setRoundTimerSec(settingsTimerSeconds));
    dispatch(setHintsAllowed(globalHintsPerGame));
  }, [dispatch, settingsTimerSeconds, globalHintsPerGame]);

  // Record a round result
  const recordRoundResult = useCallback(async (roundResultData: RoundResult): Promise<boolean> => {
    if (!gameId) {
      console.error('Game ID is null, cannot record round result.');
      dispatch(setError(createError('NO_GAME_ID', 'Cannot record result without a game ID.')));
      return false;
    }
    
    try {
      console.log('Starting recordRoundResult for gameId:', gameId);
      
      // First, ensure the game exists
      console.log('Checking if game exists in database...');
      const { data: gameData, error: gameError } = await supabaseClient
        .from('games')
        .select('id, created_at')
        .eq('id', gameId)
        .single();

      // If game doesn't exist, create it
      if (gameError || !gameData) {
        console.log('Game not found, creating new game record...');
        const newGame = {
          id: gameId,
          mode: 'solo',
          created_at: new Date().toISOString(),
          created_by: null,
          completed: false,
          current_round: 1,
          round_count: 5,
          score: 0
        };
        
        const { error: createError } = await supabaseClient
          .from('games')
          .insert(newGame);
          
        if (createError) {
          console.error('Error creating game:', createError);
          throw new Error('Could not create game record');
        }
        console.log('Created new game record');
      } else {
        console.log('Found existing game record');
      }

      // Prepare the round data with only the fields that exist in the game_rounds table
      const roundData = {
        game_id: gameId,
        round_index: roundResultData.roundIndex + 1, // Convert to 1-based index
        image_id: roundResultData.imageId,
        created_at: new Date().toISOString()
      };
      
      console.log('Inserting round data:', roundData);
      
      // Try to insert with select to get the inserted data
      const { data: insertedData, error: insertError } = await supabaseClient
        .from('game_rounds')
        .insert(roundData)
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting round result (with select):', insertError);
        
        // If the first insert with select fails, try insert without select
        console.log('Attempting insert without select...');
        const { error: simpleInsertError } = await supabaseClient
          .from('game_rounds')
          .insert(roundData);
          
        if (simpleInsertError) {
          console.error('Error inserting round result (simple insert):', simpleInsertError);
          throw simpleInsertError;
        }
        
        // If we get here, the insert succeeded but we don't have the inserted data
        // Fetch the most recent round for this game
        const { data: latestRound, error: fetchError } = await supabaseClient
          .from('game_rounds')
          .select('*')
          .eq('game_id', gameId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (fetchError) {
          console.error('Error fetching inserted round:', fetchError);
          throw new Error('Round result recorded but could not retrieve details');
        }
        
        console.log('Successfully inserted round result (fetched after insert)');
        return true;
      }
      
      console.log('Successfully inserted round result');
      return true;
      
    } catch (err) {
      console.error('Exception in recordRoundResult:', {
        error: err,
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined
      });
      return false;
    }
  }, [gameId, dispatch, supabaseClient]);

  // Start a new game or join an existing one
  const startGame = useCallback(
    async (existingGameId?: string, initialSettings?: Partial<GameSettings>) => {
      dispatch(setIsLoading(true));
      dispatch(setError(null));
      const newGameId = existingGameId || uuidv4();
      dispatch(setGameId(newGameId));
      dispatch(setRoundResults([])); // Clear previous round results

      if (initialSettings) {
        updateSettings(initialSettings);
      } else {
        applyGlobalDefaultSettings();
      }

      try {
        const { data, error: dbError } = await supabaseClient
          .from('images') // Assuming 'images' table
          .select('*')
          .limit(DEFAULT_IMAGES_PER_GAME);

        if (dbError) throw dbError;
        if (!data || data.length === 0) throw new Error('No images found for the game.');

        const gameImages = data.map(mapSupabaseImageToGameImage);
        dispatch(setImages(gameImages));

        if (!existingGameId) {
          const { data: { session: currentSessionData } } = await supabaseClient.auth.getSession();
          const currentUserId = currentSessionData?.user?.id;
          const gameMode = initialSettings?.mode || 'solo'; // Extract mode or default to 'solo'
          const { error: gameInsertError } = await supabaseClient.from('games').insert({
            id: newGameId,
            user_id: currentUserId,
            mode: gameMode, // Add mode to the insert object
          });
          if (gameInsertError) {
            console.error('Failed to create game record:', gameInsertError);
            // Non-critical for now, game can proceed locally
          }
          
          // Navigate to the first round after starting a new game
          navigate('/test/game/solo/1');
        }
      } catch (err) {
        console.error('Error starting game:', err);
        dispatch(setError(handleError(err, 'Failed to start game.')));
        dispatch(setGameId(null));
      }
      dispatch(setIsLoading(false));
    },
    [dispatch, supabaseClient, updateSettings, applyGlobalDefaultSettings] // Removed session
  );

  // Complete the current round
  const completeRound = useCallback(
    async (result: {
      guessCoordinates: GuessCoordinates | null;
      guessYear: number | null;
      hintsUsed: number;
      timeTakenSeconds: number;
    }) => {
      try { // Added missing try block
        if (!currentImage) {
          console.error('No image for current round.');
          dispatch(setError(createError('NO_IMAGE_FOR_ROUND', 'Image data is missing for this round.')));
          return;
        }
        dispatch(setIsLoading(true));

        // Calculate derived values
        const actualCoordinates = { lat: currentImage.latitude, lng: currentImage.longitude };
        const distanceKm = result.guessCoordinates 
          ? calculateDistance(
              result.guessCoordinates.lat, 
              result.guessCoordinates.lng, 
              actualCoordinates.lat, 
              actualCoordinates.lng
            )
          : 0;
        
        const accuracy = calculateAccuracy(distanceKm);
        const score = calculateScore(accuracy, result.timeTakenSeconds || 0);
        const xpEarned = calculateXPEarned(accuracy);

        // Create the complete round result
        const completeRoundResult: RoundResult = {
          ...result,
          roundIndex: currentRoundIndex,
          imageId: currentImage.id,
          guessCoordinates: result.guessCoordinates || { lat: 0, lng: 0 },
          actualCoordinates,
          distanceKm,
          score,
          guessYear: result.guessYear || new Date().getFullYear(),
          xpWhere: 0, // Will be calculated based on distance
          xpWhen: 0,  // Will be calculated based on year guess
          accuracy,
          hintsUsed: result.hintsUsed || 0,
          timeTakenSeconds: result.timeTakenSeconds || 0
        };

        // Update round results
        const updatedResults = [...roundResults, completeRoundResult];
        dispatch(setRoundResults(updatedResults));

        // Calculate and update total accuracy and XP
        const totalAccuracy = updatedResults.reduce((sum, result) => sum + (result.accuracy || 0), 0) / updatedResults.length;
        const totalXP = updatedResults.reduce((sum, result) => sum + 0, 0); // TODO: Reinstate XP calculation when RoundResult.xpEarned is fixed
        
        dispatch(setTotalGameAccuracy(totalAccuracy));
        dispatch(setTotalGameXP(totalXP));

        // Persist the updated state
        await persistGameState({
          gameId: gameId || '',
          roomId: roomId || '',
          images,
          roundResults: updatedResults,
          hintsAllowed,
          roundTimerSec,
          totalGameAccuracy: totalAccuracy,
          totalGameXP: totalXP,
        });

        // Check if game is complete
        if (currentRoundIndex >= images.length - 1) {
          // Game is complete
          navigate('/game/summary');
        } else {
          // Move to next round
          navigate(`/game/round/${currentRoundIndex + 1}`);
        }
      } catch (error) {
        dispatch(setError(handleError(error, 'Failed to complete round')));
        throw error;
      }
    }, 
    [dispatch, gameId, currentImage, currentRoundIndex, roundResults, hintsAllowed, roundTimerSec, images, navigate, roomId]
  );

  // Handle game completion
  const completeGame = useCallback(async () => {
    dispatch(setIsLoading(true));
    console.log('Game completed!');
    if (gameId) {
        const { error: updateError } = await supabaseClient
            .from('games')
            .update({ 
                score: totalGameXP, // Using score instead of total_accuracy
                completed_at: new Date().toISOString(),
                status: 'completed'
             })
            .eq('id', gameId);
        if (updateError) {
            dispatch(setError(handleError(updateError, 'Failed to update game completion status.')));
        }
    }
    dispatch(setIsLoading(false));
    if (gameId) navigate(`/summary/${gameId}`);
  }, [dispatch, navigate, gameId, supabaseClient, totalGameXP]);
  
  // Reset the game state
  const resetGame = useCallback(() => {
    clearSavedGameState();
    dispatch(resetGameAction(initialGameState)); // Pass initialGameState to the action creator
    applyGlobalDefaultSettings();
    navigate('/'); 
  }, [dispatch, navigate, applyGlobalDefaultSettings]);
  
  // Fetch global metrics
  const fetchGlobalMetrics = useCallback(async () => {
    try {
      dispatch(setIsLoading(true));
      // Implementation would go here
      console.log('Fetching global metrics');
      // Add actual implementation when required
    } catch (error) {
      dispatch(setError(handleError(error, 'Failed to fetch global metrics')));
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch]);
  
  // Refresh global metrics
  const refreshGlobalMetrics = useCallback(async () => {
    try {
      dispatch(setIsLoading(true));
      // Implementation would go here
      console.log('Refreshing global metrics');
      // Add actual implementation when required
    } catch (error) {
      dispatch(setError(handleError(error, 'Failed to refresh global metrics')));
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [dispatch]);

  // Define context value
  const contextValue = useMemo(() => ({
    ...state,
    currentImage,
    currentRoundIndex,
    startGame,
    completeRound,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    updateSettings,
    completeGame,
  }), [
    state, 
    currentImage, 
    currentRoundIndex, 
    startGame,
    completeRound,
    recordRoundResult,
    resetGame,
    fetchGlobalMetrics,
    updateSettings,
    completeGame,
  ]);

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
};

/**
 * Custom hook to use the game context
 */
export const useGame = (): GameContextType => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
