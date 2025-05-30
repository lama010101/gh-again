import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Target, Zap } from 'lucide-react';
import { formatInteger } from '@/utils/format';

interface FinalScoreSummaryDisplayProps {
  totalScore: number;
  totalPercentage: number;
}

const FinalScoreSummaryDisplay: React.FC<FinalScoreSummaryDisplayProps> = ({ totalScore, totalPercentage }) => {
  return (
    <div className="text-center mb-8 sm:mb-12">
      <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-history-primary dark:text-history-light">
        Final Score
      </h1>
      <div className="flex justify-center gap-6 mb-4">
        <div className="flex flex-col items-center">
          <Badge variant="outline" className="mb-2 text-lg px-3 py-1 border-2 border-history-primary text-history-primary">
            <Target className="h-4 w-4 mr-1" />
            {formatInteger(totalPercentage)}%
          </Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">Accuracy</span>
        </div>
        <div className="flex flex-col items-center">
          <Badge variant="outline" className="mb-2 text-lg px-3 py-1 border-2 border-history-primary text-history-primary">
            <Zap className="h-4 w-4 mr-1" />
            {formatInteger(totalScore)}
          </Badge>
          <span className="text-sm text-gray-500 dark:text-gray-400">Points</span>
        </div>
      </div>
    </div>
  );
};

export default FinalScoreSummaryDisplay;
