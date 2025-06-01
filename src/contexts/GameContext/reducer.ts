import { GameState } from './types';
import { GameImage, RoundResult, GameErrorType } from '@/types/game';

// Define action types
export enum GameActionTypes {
  SET_GAME_ID = 'SET_GAME_ID',
  SET_ROOM_ID = 'SET_ROOM_ID',
  SET_IMAGES = 'SET_IMAGES',
  SET_ROUND_RESULTS = 'SET_ROUND_RESULTS',
  SET_IS_LOADING = 'SET_IS_LOADING',
  SET_ERROR = 'SET_ERROR',
  SET_HINTS_ALLOWED = 'SET_HINTS_ALLOWED',
  SET_ROUND_TIMER_SEC = 'SET_ROUND_TIMER_SEC',
  SET_TOTAL_GAME_ACCURACY = 'SET_TOTAL_GAME_ACCURACY',
  SET_TOTAL_GAME_XP = 'SET_TOTAL_GAME_XP',
  RESET_GAME = 'RESET_GAME'
}

// Define action interfaces
export type GameAction = 
  | { type: GameActionTypes.SET_GAME_ID, payload: string | null }
  | { type: GameActionTypes.SET_ROOM_ID, payload: string | null }
  | { type: GameActionTypes.SET_IMAGES, payload: GameImage[] }
  | { type: GameActionTypes.SET_ROUND_RESULTS, payload: RoundResult[] }
  | { type: GameActionTypes.SET_IS_LOADING, payload: boolean }
  | { type: GameActionTypes.SET_ERROR, payload: GameErrorType | null }
  | { type: GameActionTypes.SET_HINTS_ALLOWED, payload: number }
  | { type: GameActionTypes.SET_ROUND_TIMER_SEC, payload: number }
  | { type: GameActionTypes.SET_TOTAL_GAME_ACCURACY, payload: number }
  | { type: GameActionTypes.SET_TOTAL_GAME_XP, payload: number }
  | { type: GameActionTypes.RESET_GAME, payload: GameState };

// Initial state
export const initialGameState: GameState = {
  gameId: null,
  roomId: null,
  images: [],
  roundResults: [],
  isLoading: false,
  error: null,
  hintsAllowed: 3,
  roundTimerSec: 60,
  totalGameAccuracy: 0,
  totalGameXP: 0
};

// Game reducer
export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case GameActionTypes.SET_GAME_ID:
      return { ...state, gameId: action.payload };
    case GameActionTypes.SET_ROOM_ID:
      return { ...state, roomId: action.payload };
    case GameActionTypes.SET_IMAGES:
      return { ...state, images: action.payload };
    case GameActionTypes.SET_ROUND_RESULTS:
      return { ...state, roundResults: action.payload };
    case GameActionTypes.SET_IS_LOADING:
      return { ...state, isLoading: action.payload };
    case GameActionTypes.SET_ERROR:
      return { ...state, error: action.payload };
    case GameActionTypes.SET_HINTS_ALLOWED:
      return { ...state, hintsAllowed: action.payload };
    case GameActionTypes.SET_ROUND_TIMER_SEC:
      return { ...state, roundTimerSec: action.payload };
    case GameActionTypes.SET_TOTAL_GAME_ACCURACY:
      return { ...state, totalGameAccuracy: action.payload };
    case GameActionTypes.SET_TOTAL_GAME_XP:
      return { ...state, totalGameXP: action.payload };
    case GameActionTypes.RESET_GAME:
      return { ...initialGameState };
    default:
      return state;
  }
};

// Action creators
export const gameActionCreators = {
  setGameId: (id: string | null) => ({ 
    type: GameActionTypes.SET_GAME_ID, 
    payload: id 
  }),
  setRoomId: (id: string | null) => ({ 
    type: GameActionTypes.SET_ROOM_ID, 
    payload: id 
  }),
  setImages: (images: GameImage[]) => ({ 
    type: GameActionTypes.SET_IMAGES, 
    payload: images 
  }),
  setRoundResults: (results: RoundResult[]) => ({ 
    type: GameActionTypes.SET_ROUND_RESULTS, 
    payload: results 
  }),
  setIsLoading: (loading: boolean) => ({ 
    type: GameActionTypes.SET_IS_LOADING, 
    payload: loading 
  }),
  setError: (error: GameErrorType | null) => ({ 
    type: GameActionTypes.SET_ERROR, 
    payload: error 
  }),
  setHintsAllowed: (hints: number) => ({ 
    type: GameActionTypes.SET_HINTS_ALLOWED, 
    payload: hints 
  }),
  setRoundTimerSec: (seconds: number) => ({ 
    type: GameActionTypes.SET_ROUND_TIMER_SEC, 
    payload: seconds 
  }),
  setTotalGameAccuracy: (accuracy: number) => ({ 
    type: GameActionTypes.SET_TOTAL_GAME_ACCURACY, 
    payload: accuracy 
  }),
  setTotalGameXP: (xp: number) => ({ 
    type: GameActionTypes.SET_TOTAL_GAME_XP, 
    payload: xp 
  }),
  resetGame: () => ({ 
    type: GameActionTypes.RESET_GAME,
    payload: initialGameState
  })
};
