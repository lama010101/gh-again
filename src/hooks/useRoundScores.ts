import { useMemo } from 'react';
import type { GameImage, RoundResult } from '@/types/game';
import type { DetailedRoundScore } from '@/types/results';
import { calculateTimeAccuracy } from '@/utils/gameCalculations';
import { getDistanceFromLatLonInKm } from '@/utils/geo';

export const useRoundScores = (images: GameImage[], roundResults: RoundResult[]): DetailedRoundScore[] => {
  return useMemo(() => {
    if (!images || !roundResults || images.length === 0 || roundResults.length === 0) {
      return [];
    }
    return roundResults.map((resultFromContext: RoundResult, index: number) => {
      const imageFromContext: GameImage = images[index];
      if (!imageFromContext || !resultFromContext) return null;

      const guessLocationFromContext = resultFromContext.guessCoordinates;
      const actualLocation = {
        lat: imageFromContext.latitude,
        lng: imageFromContext.longitude,
      };

      let locationAccuracy = { score: 0, distanceKm: 0 };
      if (guessLocationFromContext) {
        try {
          const distanceKm = getDistanceFromLatLonInKm(
            guessLocationFromContext.lat,
            guessLocationFromContext.lng,
            actualLocation.lat,
            actualLocation.lng
          );
          const maxDistance = 5000; // Max distance for scoring
          const score = Math.max(0, 100 - Math.min(100, (distanceKm / maxDistance) * 100));
          locationAccuracy = {
            score: Math.round(score),
            distanceKm: Math.round(distanceKm * 10) / 10,
          };
        } catch (e) {
          console.error('Error calculating location accuracy:', e);
        }
      }

      let timeAccuracy = { score: 0 };
      if (resultFromContext.guessYear) {
        try {
          const timeResult = calculateTimeAccuracy(resultFromContext.guessYear, imageFromContext.year);
          timeAccuracy = typeof timeResult === 'number' ? { score: timeResult } : timeResult;
        } catch (e) {
          console.error('Error calculating time accuracy:', e);
        }
      }

      return {
        roundXP: (locationAccuracy?.score || 0) + (timeAccuracy?.score || 0),
        roundPercent: (((locationAccuracy?.score || 0) + (timeAccuracy?.score || 0)) / 200) * 100,
        locationAccuracy,
        timeAccuracy,
        timeDifference: resultFromContext.guessYear ? Math.abs(resultFromContext.guessYear - imageFromContext.year) : 0,
        distanceKm: locationAccuracy.distanceKm,
        hintPenalty: resultFromContext.hintsUsed ? resultFromContext.hintsUsed * 30 : 0,
        hintPenaltyPercent: resultFromContext.hintsUsed ? (resultFromContext.hintsUsed * 30) / 2 : 0,
        originalImageId: imageFromContext.id,
        originalImageUrl: imageFromContext.image_url,
        originalYear: imageFromContext.year,
        originalLatitude: imageFromContext.latitude,
        originalLongitude: imageFromContext.longitude,
        originalGuessCoordinates: resultFromContext.guessCoordinates,
        originalGuessYear: resultFromContext.guessYear,
        originalHintsUsed: resultFromContext.hintsUsed,
      };
    }).filter(score => score !== null) as DetailedRoundScore[];
  }, [images, roundResults]);
};
