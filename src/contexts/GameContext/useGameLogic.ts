import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettingsStore } from '@/lib/useSettingsStore';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { v4 as uuidv4 } from 'uuid';
import { GameSettings, GameImage, RoundResult, GameErrorType } from '@/types/game';
import { supabase } from '@/integrations/supabase/client';
import { DEFAULT_IMAGES_PER_GAME } from './constants';
import { handleError } from './errors';
import { validateRoundResult } from './validation';
import { persistGameState, loadPersistedState, clearSavedGameState } from './storage';

/**
 * Helper function to map Supabase image data to GameImage type
 * @param dbImage - Image data from database
 * @returns Formatted GameImage object
 */
const mapSupabaseImageToGameImage = (dbImage: any): GameImage => {
  const { data } = supabase.storage
    .from('images')
    .getPublicUrl(dbImage.image_path);

  return {
    id: dbImage.id,
    title: dbImage.title,
    description: dbImage.description,
    latitude: dbImage.latitude,
    longitude: dbImage.longitude,
    year: dbImage.year,
    image_url: data.publicUrl,
    location_name: dbImage.location_name,
    url: data.publicUrl
  };
};

/**
 * Custom hook for game logic functionality
 */
export const useGameLogic = () => {
  const navigate = useNavigate();
  const supabaseClient = useSupabaseClient<Database>();
  
  // Get global settings from settings store
  const settingsTimerSeconds = useSettingsStore(state => state.timerSeconds);
  const globalHintsPerGame = useSettingsStore(state => state.hintsPerGame);
  
  // State management
  const [gameId, setGameId] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [images, setImages] = useState<GameImage[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<GameErrorType | null>(null);
  const [hintsAllowed, setHintsAllowed] = useState<number>(globalHintsPerGame);
  const [roundTimerSec, setRoundTimerSec] = useState<number>(settingsTimerSeconds);
  const [totalGameAccuracy, setTotalGameAccuracy] = useState<number>(0);
  const [totalGameXP, setTotalGameXP] = useState<number>(0);
  
  // Apply game settings
  const applyGameSettings = useCallback((settings: Partial<GameSettings>) => {
    if (settings.timerSeconds !== undefined) {
      setRoundTimerSec(settings.timerSeconds);
    }
    
    if (settings.hintsPerGame !== undefined) {
      setHintsAllowed(settings.hintsPerGame);
    }
  }, []);
  
  // Apply global default settings
  const applyGlobalDefaultSettings = useCallback(() => {
    setRoundTimerSec(settingsTimerSeconds);
    setHintsAllowed(globalHintsPerGame);
  }, [settingsTimerSeconds, globalHintsPerGame]);
  
  /**
   * Saves current game state to localStorage
   */
  const saveGameState = useCallback(() => {
    if (!gameId) return;
    
    const stateToSave = {
      gameId,
      roomId,
      images,
      roundResults,
      hintsAllowed,
      roundTimerSec,
      totalGameAccuracy,
      totalGameXP
    };
    
    persistGameState(stateToSave);
  }, [
    gameId, 
    roomId, 
    images, 
    roundResults, 
    hintsAllowed, 
    roundTimerSec, 
    totalGameAccuracy, 
    totalGameXP
  ]);
  
  // Save game state when it changes
  useEffect(() => {
    if (gameId) {
      saveGameState();
    }
  }, [
    gameId, 
    roomId, 
    images, 
    roundResults, 
    hintsAllowed, 
    roundTimerSec, 
    saveGameState
  ]);
  
  // Load saved game state on mount
  useEffect(() => {
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
  }, []);
  
  // Calculate the current round index
  const currentRoundIndex = roundResults.length;
  
  // Start a new game or join an existing one
  const startGame = useCallback(async (
    mode: 'solo' | 'multi', 
    existingGameId?: string, 
    initialSettings?: Partial<GameSettings>
  ) => {
    try {
      setIsLoading(true);
      
      if (existingGameId) {
        // Handle joining an existing game
        setGameId(existingGameId);
        
        // Fetch the game data
        const { data: gameData, error: gameError } = await supabaseClient
          .from('games')
          .select('*')
          .eq('id', existingGameId)
          .single();
          
        if (gameError) throw gameError;
        if (!gameData) throw new Error('Game not found');
        
        // Apply the game settings
        if (gameData.settings) {
          applyGameSettings(gameData.settings as GameSettings);
        } else {
          applyGlobalDefaultSettings();
        }
        
        // Load images associated with the game
        const { data: gameImages, error: imagesError } = await supabaseClient
          .from('game_images')
          .select('image_id')
          .eq('game_id', existingGameId);
          
        if (imagesError) throw imagesError;
        
        if (gameImages && gameImages.length > 0) {
          const imageIds = gameImages.map(gi => gi.image_id);
          
          const { data: imagesData, error: fetchError } = await supabaseClient
            .from('images')
            .select('*')
            .in('id', imageIds);
            
          if (fetchError) throw fetchError;
          
          if (imagesData) {
            const formattedImages = imagesData.map(mapSupabaseImageToGameImage);
            setImages(formattedImages);
          }
        }
      } else {
        // Creating a new game
        const newGameId = uuidv4();
        setGameId(newGameId);
        
        // Apply initial settings if provided, otherwise use defaults
        if (initialSettings) {
          applyGameSettings(initialSettings);
        } else {
          applyGlobalDefaultSettings();
        }
        
        // Fetch random images for the new game
        const { data: imagesData, error: imagesError } = await supabaseClient
          .from('images')
          .select('*')
          .limit(DEFAULT_IMAGES_PER_GAME);
          
        if (imagesError) throw imagesError;
        
        if (imagesData) {
          const formattedImages = imagesData.map(mapSupabaseImageToGameImage);
          setImages(formattedImages);
          
          // Create game record in database
          const { error: createGameError } = await supabaseClient
            .from('games')
            .insert({
              id: newGameId,
              creator_id: (await supabase.auth.getUser()).data.user?.id,
              settings: initialSettings || {
                timerSeconds: settingsTimerSeconds,
                hintsPerGame: globalHintsPerGame
              },
              mode
            });
            
          if (createGameError) throw createGameError;
          
          // Associate images with the game
          const gameImagesData = formattedImages.map(image => ({
            game_id: newGameId,
            image_id: image.id
          }));
          
          const { error: associateImagesError } = await supabaseClient
            .from('game_images')
            .insert(gameImagesData);
            
          if (associateImagesError) throw associateImagesError;
        }
      }
      
      // Reset round results for the new game
      setRoundResults([]);
      setTotalGameAccuracy(0);
      setTotalGameXP(0);
      
      // Navigate to the first round
      navigate('/game/round/0');
    } catch (error) {
      setError(handleError(error, 'Failed to start game'));
      return Promise.reject(error);
    } finally {
      setIsLoading(false);
    }
  }, [
    supabaseClient, 
    navigate, 
    settingsTimerSeconds, 
    globalHintsPerGame, 
    applyGameSettings, 
    applyGlobalDefaultSettings
  ]);
  
  // Record the result of a round
  const recordRoundResult = useCallback(async (
    result: Omit<RoundResult, 'imageId' | 'actualCoordinates' | 'roundIndex' | 'timestamp'> & {
      roundIndex: number;
      imageId: string;
      actualCoordinates: { lat: number; lng: number };
    }
  ) => {
    try {
      const currentImage = images[result.roundIndex];
      if (!currentImage) {
        setError(handleError(new Error('Image not found'), 'Failed to record round result'));
        return false;
      }
      
      // Create the complete round result
      const completeResult: RoundResult = {
        ...result,
        timestamp: new Date().toISOString(),
        // These are needed to satisfy the validation, even though they're in the input already
        roundIndex: result.roundIndex,
        imageId: result.imageId,
        actualCoordinates: result.actualCoordinates,
        // Set default values for optional fields
        hintsUsed: result.hintsUsed || 0,
        xpWhere: result.xpWhere || 0,
        xpWhen: result.xpWhen || 0,
        accuracy: result.accuracy || 0,
      };
      
      // Validate the result
      if (!validateRoundResult(completeResult)) {
        setError(handleError(new Error('Invalid round result'), 'Failed to validate round result'));
        return false;
      }
      
      // Add the result to the state
      const newResults = [...roundResults, completeResult];
      setRoundResults(newResults);
      
      // Calculate total game accuracy
      const totalAccuracy = newResults.reduce((acc, r) => acc + r.accuracy, 0) / newResults.length;
      setTotalGameAccuracy(Math.min(Math.round(totalAccuracy), 100));
      
      // Calculate total game XP
      const totalXP = newResults.reduce((acc, r) => acc + r.xpWhere + r.xpWhen, 0);
      setTotalGameXP(totalXP);
      
      // Save the result to the database if we have a gameId
      if (gameId) {
        const { error: saveError } = await supabaseClient
          .from('round_results')
          .insert({
            game_id: gameId,
            round_index: completeResult.roundIndex,
            image_id: completeResult.imageId,
            guess_coordinates: completeResult.guessCoordinates,
            actual_coordinates: completeResult.actualCoordinates,
            distance_km: completeResult.distanceKm,
            score: completeResult.score,
            guess_year: completeResult.guessYear,
            actual_year: currentImage.year,
            xp_where: completeResult.xpWhere,
            xp_when: completeResult.xpWhen,
            accuracy: completeResult.accuracy,
            hints_used: completeResult.hintsUsed
          });
          
        if (saveError) {
          console.error('Failed to save round result:', saveError);
          // Continue even if saving to DB fails
        }
      }
      
      return true;
    } catch (error) {
      setError(handleError(error, 'Failed to record round result'));
      return false;
    }
  }, [gameId, images, roundResults, supabaseClient]);
  
  // Reset the game state
  const resetGame = useCallback(() => {
    setGameId(null);
    setRoomId(null);
    setImages([]);
    setRoundResults([]);
    setError(null);
    setHintsAllowed(globalHintsPerGame);
    setRoundTimerSec(settingsTimerSeconds);
    setTotalGameAccuracy(0);
    setTotalGameXP(0);
    clearSavedGameState();
  }, [globalHintsPerGame, settingsTimerSeconds]);
  
  // Fetch global metrics
  const fetchGlobalMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      // Implementation would go here
    } catch (error) {
      setError(handleError(error, 'Failed to fetch global metrics'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Refresh global metrics
  const refreshGlobalMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      // Implementation would go here
    } catch (error) {
      setError(handleError(error, 'Failed to refresh global metrics'));
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    // State
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
    
    // State setters
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
    
    // Game control
    startGame,
    recordRoundResult,
    resetGame,
    
    // Game metrics
    fetchGlobalMetrics,
    refreshGlobalMetrics,
    
    // Utilities
    saveGameState,
    applyGameSettings,
    currentRoundIndex
  };
};
