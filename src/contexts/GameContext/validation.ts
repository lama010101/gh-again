import { 
  GameSettings, 
  GuessCoordinates, 
  RoundResult, 
  GameImage,
  PersistedGameState
} from '@/types/game';
import {
  MIN_LATITUDE,
  MAX_LATITUDE,
  MIN_LONGITUDE,
  MAX_LONGITUDE,
  MIN_YEAR,
  MAX_YEAR
} from '@/constants/game';

/**
 * Validation functions for GameSettings
 * @param settings - The settings to validate
 * @returns Boolean indicating if settings are valid
 */
export const validateGameSettings = (settings: GameSettings): boolean => {
  return settings.timerSeconds >= 0 && settings.hintsPerGame >= 0;
};

/**
 * Validation function for coordinates
 * @param coords - The coordinates to validate
 * @returns Boolean indicating if coordinates are valid
 */
export const validateCoordinates = (coords: GuessCoordinates): boolean => {
  return coords.lat >= MIN_LATITUDE && coords.lat <= MAX_LATITUDE && 
         coords.lng >= MIN_LONGITUDE && coords.lng <= MAX_LONGITUDE;
};

/**
 * Validation function for RoundResult
 * @param result - The round result to validate
 * @returns Boolean indicating if result is valid
 */
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

/**
 * Validation function for GameImage
 * @param image - The image to validate
 * @returns Boolean indicating if image is valid
 */
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

/**
 * Type guard to validate persisted state
 * @param state - The state to validate
 * @returns Boolean indicating if state is valid
 */
export const validatePersistedState = (state: unknown): state is PersistedGameState => {
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
