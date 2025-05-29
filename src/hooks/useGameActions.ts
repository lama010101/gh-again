import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { GameImage, RoundResult, GameSettings } from '@/contexts/GameContext'; // Assuming these types are exported
import { useGameState } from './useGameState';
import { Database } from '@/integrations/supabase/types'; // Import Database type
import { shuffleArray } from '@/utils/arrayUtils'; // Import shuffleArray

interface UseGameActionsReturn {
  startGame: (settings?: { timerSeconds?: number; hintsPerGame?: number }, existingGameId?: string) => Promise<void>;
  recordRoundResult: (newResult: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number, currentRoundImage: GameImage) => void;
}

export const useGameActions = (): UseGameActionsReturn => {
  const navigate = useNavigate();
  const {
    gameId,
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
    roundResults,
    resetGameState,
  } = useGameState();

  const applyGameSettings = useCallback((settings?: { timerSeconds?: number; hintsPerGame?: number }) => {
    if (settings) {
      if (typeof settings.timerSeconds === 'number') setRoundTimerSec(settings.timerSeconds);
      if (typeof settings.hintsPerGame === 'number') setHintsAllowed(settings.hintsPerGame);
    }
  }, [setHintsAllowed, setRoundTimerSec]);

  const startGame = useCallback(async (settings?: { timerSeconds?: number; hintsPerGame?: number }, existingGameId?: string) => {
    setIsLoading(true);
    setError(null);
    resetGameState(); // Reset state at the start of a new game

    try {
      const currentRoomId = existingGameId || uuidv4();
      setGameId(currentRoomId);

      // Fetch 5 random images for the game
      const { data: randomImages, error: randomImagesError } = await supabase
        .from('images')
        .select('*')
        .eq('ready', true) // Only select ready images
        .order('id', { ascending: true }) // Order by ID to ensure consistent random selection for now
        .limit(5); // Get 5 images

      if (randomImagesError || !randomImages || randomImages.length === 0) {
        throw new Error(`Error fetching random images: ${randomImagesError?.message || 'No images found'}`);
      }

      const shuffledImages = shuffleArray(randomImages as GameImage[]);
      setImages(shuffledImages);

      // Create a new game entry in Supabase (or update existing if existingGameId is provided)
      const { data: gameEntry, error: gameEntryError } = await supabase
        .from('games')
        .upsert({
          id: currentRoomId,
          created_by: 'anon', // Placeholder for user ID
          mode: 'solo', // Default mode
          round_count: shuffledImages.length, // Number of rounds based on images fetched
          // You can add settings here if you decide to store them in the game entry
        })
        .select()
        .single();

      if (gameEntryError || !gameEntry) {
        throw new Error(`Error creating/updating game entry: ${gameEntryError?.message}`);
      }

      // Apply settings passed to startGame or use defaults
      setHintsAllowed(settings?.hintsPerGame || 3); // Default to 3 hints
      setRoundTimerSec(settings?.timerSeconds || 60); // Default to 60 seconds

      navigate(`/test/game/room/${currentRoomId}/round/1`);

    } catch (err: any) {
      console.error('Failed to start game:', err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [setGameId, setImages, setHintsAllowed, setRoundTimerSec, resetGameState, navigate, setIsLoading, setError]);

  const recordRoundResult = useCallback(
    (newResult: Omit<RoundResult, 'roundIndex' | 'imageId' | 'actualCoordinates'>, currentRoundIndex: number, currentRoundImage: GameImage) => {
      setRoundResults((prevResults: RoundResult[]) => {
      const updatedResult: RoundResult = {
        ...newResult,
        roundIndex: currentRoundIndex,
        imageId: currentRoundImage.id,
        actualCoordinates: { lat: currentRoundImage.latitude, lng: currentRoundImage.longitude },
      };
      const newResults = [...prevResults];
      newResults[currentRoundIndex] = updatedResult;

      // Calculate total accuracy and XP based on newResults
      const totalAccuracy = newResults.reduce((sum, r) => sum + (r.accuracy || 0), 0) / newResults.length;
      const totalXP = newResults.reduce((sum, r) => sum + (r.score || 0), 0);

      setTotalGameAccuracy(totalAccuracy);
      setTotalGameXP(totalXP);

      return newResults;
    });
    },
    [setRoundResults, setTotalGameAccuracy, setTotalGameXP]
  );

  return {
    startGame,
    recordRoundResult,
  };
};
