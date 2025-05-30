export interface DetailedRoundScore {
  roundXP: number;
  roundPercent: number;
  locationAccuracy: { score: number; distanceKm: number };
  timeAccuracy: { score: number };
  timeDifference: number;
  distanceKm: number; // Distance in kilometers between guess and actual location
  hintPenalty?: number;
  hintPenaltyPercent?: number;
  // Fields to store original data for RoundDetailCard
  originalImageId: string;
  originalImageUrl: string;
  originalYear: number;
  originalLatitude: number;
  originalLongitude: number;
  originalGuessCoordinates: { lat: number; lng: number } | null;
  originalGuessYear: number | null;
  originalHintsUsed: number;
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
