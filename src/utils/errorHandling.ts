/**
 * Error handling utilities for the application
 */
import { GameErrorType } from '@/types/game';

/**
 * Creates a standardized error object
 * @param code - Error code
 * @param message - User-friendly error message
 * @param details - Additional error details (for logging)
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
 * @param defaultMessage - User-friendly default message if error has no message
 * @returns GameErrorType object
 */
export const handleError = (error: unknown, defaultMessage: string): GameErrorType => {
  // Log the error for debugging
  console.error('Error caught by error handler:', error);
  
  // Handle different error types
  if (error instanceof Error) {
    return createError('UNKNOWN_ERROR', error.message || defaultMessage, error);
  } else if (typeof error === 'string') {
    return createError('UNKNOWN_ERROR', error || defaultMessage);
  }
  
  return createError('UNKNOWN_ERROR', defaultMessage);
};

/**
 * Formats an error message for display to the user
 * @param error - The error to format
 * @returns A user-friendly error message
 */
export const formatErrorMessage = (error: GameErrorType): string => {
  switch (error.code) {
    case 'NETWORK_ERROR':
      return 'Network connection issue. Please check your internet connection and try again.';
    case 'VALIDATION_ERROR':
      return `Validation error: ${error.message}`;
    case 'UNAUTHORIZED':
      return 'You are not authorized to perform this action. Please sign in and try again.';
    case 'NOT_FOUND':
      return 'The requested resource was not found.';
    case 'SERVER_ERROR':
      return 'Server error. Our team has been notified and we are working to fix it.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
};

/**
 * Custom error classes
 */
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

export class AuthorizationError extends GameError {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Error handlers for specific scenarios
 */
export const handleNetworkError = (error: unknown): GameErrorType => {
  console.error('Network error:', error);
  return createError(
    'NETWORK_ERROR',
    'Connection failed. Please check your internet and try again.',
    error
  );
};

export const handleValidationError = (error: unknown): GameErrorType => {
  console.error('Validation error:', error);
  return createError(
    'VALIDATION_ERROR',
    error instanceof Error ? error.message : 'Invalid input data.',
    error
  );
};

export const handleAuthorizationError = (error: unknown): GameErrorType => {
  console.error('Authorization error:', error);
  return createError(
    'UNAUTHORIZED',
    'You are not authorized to perform this action.',
    error
  );
};
