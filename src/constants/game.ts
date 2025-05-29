/**
 * Game constants used throughout the application
 */

// Distance calculation
export const KM_CONVERSION_FACTOR = 111; // Rough approximation for converting lat/lng degrees to kilometers

// Scoring constants
export const MAX_SCORE_PER_ROUND = 2000;
export const LOCATION_MAX_SCORE = 1000;
export const TIME_MAX_SCORE = 1000;
export const HINT_PENALTY = 0.1; // 10% penalty per hint used

// Round configuration
export const DEFAULT_ROUND_TIME_SECONDS = 60;
export const DEFAULT_HINTS_PER_GAME = 3;
export const ROUNDS_PER_GAME = 5;

// Coordinates boundaries
export const MIN_LATITUDE = -90;
export const MAX_LATITUDE = 90;
export const MIN_LONGITUDE = -180;
export const MAX_LONGITUDE = 180;

// Years
export const MIN_YEAR = 1800;
export const MAX_YEAR = new Date().getFullYear();

// Storage
export const GAME_STORAGE_KEY = 'gh_current_game';

// Game modes
export const GAME_MODES = {
  SOLO: 'solo',
  MULTI: 'multi',
} as const;
