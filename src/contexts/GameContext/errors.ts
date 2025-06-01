import { GameErrorType } from '@/types/game';

/**
 * Creates a standardized error object
 * @param code - Error code
 * @param message - Error message
 * @param details - Additional error details
 * @returns GameErrorType object
 */
export const createError = (code: string, message: string, details?: unknown): GameErrorType => ({
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
export const handleError = (error: unknown, defaultMessage: string): GameErrorType => {
  // Attempt to extract a meaningful message from the error
  if (error instanceof Error) {
    return createError('UNKNOWN_ERROR', error.message || defaultMessage);
  } else if (typeof error === 'object' && error !== null) {
    // Handle Supabase-specific error objects
    const errorObj = error as any;
    if (errorObj.message) {
      return createError('UNKNOWN_ERROR', errorObj.message);
    } else if (errorObj.error && errorObj.error.message) {
      return createError('UNKNOWN_ERROR', errorObj.error.message);
    } else if (errorObj.details) {
      return createError('UNKNOWN_ERROR', errorObj.details);
    }
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
