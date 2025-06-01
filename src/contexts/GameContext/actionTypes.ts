import { GameImage, RoundResult, GameErrorType } from '../../types/game';

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
  RESET_GAME = 'RESET_GAME',
}

export type GameAction =
  | { type: GameActionTypes.SET_GAME_ID; payload: string | null }
  | { type: GameActionTypes.SET_ROOM_ID; payload: string | null }
  | { type: GameActionTypes.SET_IMAGES; payload: GameImage[] }
  | { type: GameActionTypes.SET_ROUND_RESULTS; payload: RoundResult[] }
  | { type: GameActionTypes.SET_IS_LOADING; payload: boolean }
  | { type: GameActionTypes.SET_ERROR; payload: GameErrorType | null }
  | { type: GameActionTypes.SET_HINTS_ALLOWED; payload: number }
  | { type: GameActionTypes.SET_ROUND_TIMER_SEC; payload: number }
  | { type: GameActionTypes.SET_TOTAL_GAME_ACCURACY; payload: number }
  | { type: GameActionTypes.SET_TOTAL_GAME_XP; payload: number }
  | { type: GameActionTypes.RESET_GAME; payload: GameState };

export interface GameState {
  gameId: string | null;
  roomId: string | null;
  images: GameImage[];
  roundResults: RoundResult[];
  isLoading: boolean;
  error: GameErrorType | null;
  hintsAllowed: number;
  roundTimerSec: number;
  totalGameAccuracy: number;
  totalGameXP: number;
}
