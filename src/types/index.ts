export interface Location {
  lat: number;
  lng: number;
}

export interface GameImage {
  id: string;
  url: string;
  year: number;
  latitude: number;
  longitude: number;
}

export interface RoundResult {
  guessLocation: Location;
  guessYear: number;
  hintsUsed: number;
}

export type GameErrorType = 'LOADING' | 'ERROR' | 'NO_GAME';
