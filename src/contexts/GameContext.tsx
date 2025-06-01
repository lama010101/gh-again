/**
 * @deprecated This file is deprecated and will be removed in a future version.
 * Please import directly from './GameContext' directory instead.
 *
 * This file serves as a compatibility bridge to maintain backward compatibility
 * with existing code that imports from this file path.
 */

// Re-export everything from the new modular implementation
export * from './GameContext';

// Export the main context components with their original names
export { GameProvider, useGame } from './GameContext/GameContext';

// For backward compatibility, export the context hooks that some components expect
import { useGame } from './GameContext/GameContext';

/**
 * @deprecated Use useGame() instead
 */
export const useGameState = () => {
  const game = useGame();
  return {
    gameId: game.gameId,
    roomId: game.roomId,
    images: game.images,
    roundResults: game.roundResults,
    isLoading: game.isLoading,
    error: game.error,
    hintsAllowed: game.hintsAllowed,
    roundTimerSec: game.roundTimerSec,
    totalGameAccuracy: game.totalGameAccuracy,
    totalGameXP: game.totalGameXP,
  };
};

/**
 * @deprecated Use useGame() instead
 */
export const useGameActions = () => {
  const game = useGame();
  // Return all the action methods from the game context
  return {
    startGame: game.startGame,
    recordRoundResult: game.recordRoundResult,
    resetGame: game.resetGame,
    setGameId: game.setGameId,
    setRoomId: game.setRoomId,
    setImages: game.setImages,
    setRoundResults: game.setRoundResults,
    setIsLoading: game.setIsLoading,
    setError: game.setError,
    setHintsAllowed: game.setHintsAllowed,
    setRoundTimerSec: game.setRoundTimerSec,
    setTotalGameAccuracy: game.setTotalGameAccuracy,
    setTotalGameXP: game.setTotalGameXP,
  };
};

