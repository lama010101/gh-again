import { useMemo } from 'react';
import type { DetailedRoundScore } from '@/types/results';
import { calculateFinalScore } from '@/utils/gameCalculations';

interface FinalScoreResult {
  finalXP: number;
  finalPercent: number;
  totalHintPenalty: number;
  totalHintPenaltyPercent: number;
  roundScores: DetailedRoundScore[]; 
}

export const useFinalScoreData = (detailedRoundScores: DetailedRoundScore[]): FinalScoreResult => {
  return useMemo(() => {
    if (!detailedRoundScores || detailedRoundScores.length === 0) {
      return { finalXP: 0, finalPercent: 0, totalHintPenalty: 0, totalHintPenaltyPercent: 0, roundScores: [] };
    }
    const aggregateScores = calculateFinalScore(detailedRoundScores);
    return {
      ...aggregateScores,
      roundScores: detailedRoundScores // Add the original detailedRoundScores back
    };
  }, [detailedRoundScores]);
};
