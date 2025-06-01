import { GameActionTypes, GameAction } from './actionTypes';
import { GameImage, RoundResult, GameErrorType } from '../../types/game';
import { GameState } from './actionTypes';

export const setGameId = (id: string | null): GameAction => ({
  type: GameActionTypes.SET_GAME_ID,
  payload: id,
});

export const setRoomId = (id: string | null): GameAction => ({
  type: GameActionTypes.SET_ROOM_ID,
  payload: id,
});

export const setImages = (images: GameImage[]): GameAction => ({
  type: GameActionTypes.SET_IMAGES,
  payload: images,
});

export const setRoundResults = (results: RoundResult[]): GameAction => ({
  type: GameActionTypes.SET_ROUND_RESULTS,
  payload: results,
});

export const setIsLoading = (loading: boolean): GameAction => ({
  type: GameActionTypes.SET_IS_LOADING,
  payload: loading,
});

export const setError = (error: GameErrorType | null): GameAction => ({
  type: GameActionTypes.SET_ERROR,
  payload: error,
});

export const setHintsAllowed = (hints: number): GameAction => ({
  type: GameActionTypes.SET_HINTS_ALLOWED,
  payload: hints,
});

export const setRoundTimerSec = (seconds: number): GameAction => ({
  type: GameActionTypes.SET_ROUND_TIMER_SEC,
  payload: seconds,
});

export const setTotalGameAccuracy = (accuracy: number): GameAction => ({
  type: GameActionTypes.SET_TOTAL_GAME_ACCURACY,
  payload: accuracy,
});

export const setTotalGameXP = (xp: number): GameAction => ({
  type: GameActionTypes.SET_TOTAL_GAME_XP,
  payload: xp,
});

export const resetGame = (initialState: GameState): GameAction => ({
  type: GameActionTypes.RESET_GAME,
  payload: initialState,
});
