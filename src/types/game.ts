export interface GuessCoordinates {
  lat: number; // -90 to 90
  lng: number; // -180 to 180
}

export interface GameImage {
  id: string;
  title: string;
  description: string;
  latitude: number; // -90 to 90
  longitude: number; // -180 to 180
  year: number; // 1800 to current year
  image_url: string;
  location_name: string;
}

export interface RoundResult {
  roundIndex: number; // 0-based index
  imageId: string;
  guessCoordinates: GuessCoordinates | null;
  actualCoordinates: GuessCoordinates;
  distanceKm: number | null; // Distance in kilometers
  score: number | null;
  guessYear: number | null;
  xpWhere: number; // Location XP (0-100)
  xpWhen: number; // Time XP (0-100)
  accuracy: number; // Overall accuracy percentage for the round (0-100)
  hintsUsed: number; // Number of hints used in this round
  timeTakenSeconds: number; // Time taken for the round in seconds
}

export interface HintData {
  gps: GuessCoordinates;
  latitude: number;
  longitude: number;
  image_url: string;
  url: string;
  description: string;
  title: string;
  location_name: string;
  year: number;
}

export interface GameSettings {
  timerSeconds: number; // Required, minimum 0
  hintsPerGame: number; // Required, minimum 0
}

export interface GameMetrics {
  gameAccuracy: number;
  gameXP: number;
  isPerfectGame: boolean;
  locationAccuracy: number;
  timeAccuracy: number;
  yearBullseye?: boolean;
  locationBullseye?: boolean;
}

export interface RoundScore {
  roundXP: number;
  roundPercent: number;
  locationAccuracy: { score: number; distanceKm: number };
  timeAccuracy: { score: number };
  timeDifference: number;
  distanceKm: number;
  hintPenalty?: number;
  hintPenaltyPercent?: number;
}

export interface PersistedGameState {
  gameId: string;
  roomId: string | null;
  images: GameImage[];
  roundResults: RoundResult[];
  hintsAllowed: number;
  roundTimerSec: number;
  totalGameAccuracy: number;
  totalGameXP: number;
}

export type GameErrorType = {
  code: string;
  message: string;
  details?: unknown;
}
