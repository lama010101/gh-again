// Re-export the GameContext to make it available for direct imports
export { GameContext } from './GameContext';

// Export the main context components
export { GameProvider, useGame } from './GameContext';

// Export types
export * from './types';

// Export validation functions
export {
  validateGameSettings,
  validateCoordinates,
  validateRoundResult,
  validateGameImage,
  validatePersistedState
} from './validation';

// Export error utilities
export {
  GameError,
  ValidationError,
  NetworkError,
  PersistenceError,
  createError,
  handleError
} from './errors';

// Export constants
export {
  DEFAULT_IMAGES_PER_GAME,
  DEFAULT_GAME_SETTINGS
} from './constants';

// Export storage utilities
export {
  persistGameState,
  loadPersistedState,
  clearSavedGameState
} from './storage';

// Export the reducer and action creators for testing or advanced usage
export { gameReducer, initialGameState, GameActionTypes, gameActionCreators } from './reducer';

// Export the context type for type safety
export type { GameContextType } from './types';
