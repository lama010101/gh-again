import { PersistedGameState } from '@/types/game';
import { GAME_STORAGE_KEY } from '@/constants/game';
import { validatePersistedState } from './validation';
import { PersistenceError } from './errors';

/**
 * Persists game state to localStorage
 * @param state - The game state to persist
 */
export const persistGameState = (state: PersistedGameState): void => {
  try {
    localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist game state:', error);
    throw new PersistenceError('Failed to save game state to local storage');
  }
};

/**
 * Loads persisted game state from localStorage
 * @returns The persisted game state or null if not found/invalid
 */
export const loadPersistedState = (): PersistedGameState | null => {
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
 * Clears saved game state from localStorage
 */
export const clearSavedGameState = (): void => {
  try {
    localStorage.removeItem(GAME_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear saved game state:', error);
  }
};
