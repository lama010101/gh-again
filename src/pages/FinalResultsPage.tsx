import React, { useState, useEffect, useCallback } from "react";
import { useLogs } from "@/contexts/LogContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Share2, Home } from "lucide-react"; // Target, Zap, Loader icons are now in their respective components or not used directly here
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { NavProfile } from "@/components/NavProfile";
// formatInteger and Badge will be used by FinalScoreSummaryDisplay, ensure they are imported there if not already.
// Game calculation utilities (calculateFinalScore, calculateTimeAccuracy) are now primarily within hooks.
import type { GameImage, RoundResult } from '@/types/game';
import RoundDetailCard from '@/components/RoundDetailCard';
import { useRoundScores } from "@/hooks/useRoundScores";
import { useFinalScoreData } from "@/hooks/useFinalScoreData";
import { useMetricsRefresh } from "@/hooks/useMetricsRefresh";
import LoadingState from "@/components/LoadingState";
import { updateUserMetrics } from "@/utils/profile/profileService";
import ErrorState from "@/components/ErrorState";
import FinalScoreSummaryDisplay from "@/components/FinalScoreSummaryDisplay";
import type { DetailedRoundScore } from "@/types/results"; // New Type for detailed scores
// Location type from '@/types' might not be directly needed here anymore.

const FinalResultsPage: React.FC = (): JSX.Element | null => {
  const [metricsHaveBeenUpdated, setMetricsHaveBeenUpdated] = useState(false);
  const { addLog } = useLogs();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  
  const { 
    gameId,
    images,
    roundResults,
    isLoading, 
    error,
    resetGame,
    startGame,
    fetchGlobalMetrics,
    refreshGlobalMetrics
  } = useGame();

  // Navigate to home if game data is missing after loading
  useEffect(() => {
    if (!isLoading && (!gameId || roundResults.length === 0)) {
      addLog('[FinalResultsPage] Missing gameId or roundResults, navigating to home.');
      navigate('/');
    }
  }, [isLoading, gameId, roundResults, navigate, addLog]);

  // Fetch initial global metrics
  useEffect(() => {
    if (gameId) {
      fetchGlobalMetrics();
    }
  }, [gameId, fetchGlobalMetrics]);

  // Use custom hook for periodic refreshing of metrics
  useMetricsRefresh(gameId, refreshGlobalMetrics);
  
  // Use custom hook to calculate detailed scores for each round
  const detailedRoundScores: DetailedRoundScore[] = useRoundScores(images, roundResults);

  // Use custom hook to calculate final score data
  const finalScoreData = useFinalScoreData(detailedRoundScores);

  // Effect to update user metrics in DB and refresh global metrics in context
  useEffect(() => {
    if (finalScoreData && finalScoreData.finalXP > 0 && user && gameId && !metricsHaveBeenUpdated) {
      addLog(`[FinalResultsPage] Attempting to update metrics for user: ${user.id}, game: ${gameId}`);
      const gameMetrics = {
        xp_earned: finalScoreData.finalXP,
        accuracy: finalScoreData.finalPercent,
        rounds_played: roundResults.length,
        hints_used_total: roundResults.reduce((acc, r) => acc + r.hintsUsed, 0),
      };

      updateUserMetrics(user.id, gameId, gameMetrics)
        .then(() => {
          addLog(`[FinalResultsPage] Successfully updated metrics for user: ${user.id}, game: ${gameId}`);
          refreshGlobalMetrics();
          addLog(`[FinalResultsPage] Global metrics refreshed.`);
          setMetricsHaveBeenUpdated(true); // Mark as updated to prevent re-running
        })
        .catch(updateError => {
          addLog(`[FinalResultsPage] Error updating metrics: ${updateError.message}`);
          console.error('Error updating user metrics:', updateError);
        });
    }
  }, [finalScoreData, user, gameId, refreshGlobalMetrics, addLog, roundResults, metricsHaveBeenUpdated]);

  const handlePlayAgain = async (): Promise<void> => {
    resetGame();
    setMetricsHaveBeenUpdated(false); // Reset flag for new game
    navigate('/');
    await startGame('solo');
  };

  const handleHome = (): void => {
    resetGame(); // Reset game state when going home
    setMetricsHaveBeenUpdated(false); // Reset flag for new game
    navigate('/');
  };

  const toggleDetails = useCallback((imageId: string): void => {
    setOpen(prevOpen => ({
      ...prevOpen,
      [imageId]: !prevOpen[imageId]
    }));
  }, []);

  // Log final score data when it changes
  useEffect(() => {
    if (finalScoreData && finalScoreData.roundScores && finalScoreData.roundScores.length > 0) {
      // Ensure that the roundScores being logged match the structure expected by the log
      // If finalScoreData.roundScores is already DetailedRoundScore[], map it to the simplified logging structure
      const loggableRoundScores = finalScoreData.roundScores.map((r: DetailedRoundScore, i: number) => ({
        round: i + 1,
        roundXP: r.roundXP,
        roundPercent: r.roundPercent,
        hintPenalty: r.hintPenalty || 0,
        hintPenaltyPercent: r.hintPenaltyPercent || 0
      }));

      addLog(`[FinalResultsPage] Final Score Data: ${JSON.stringify({
        roundScores: loggableRoundScores,
        finalXP: finalScoreData.finalXP,
        finalPercent: finalScoreData.finalPercent,
        totalHintPenalty: finalScoreData.totalHintPenalty,
        totalHintPenaltyPercent: finalScoreData.totalHintPenaltyPercent
      }, null, 2)}`);
    }
  }, [finalScoreData, addLog]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error && (!roundResults || roundResults.length === 0)) {
    return <ErrorState errorMessage={error.message || 'Failed to load results'} onRetry={handleHome} />;
  }

  if (!images || images.length === 0) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">No game data found for this session.</p>
          <Button onClick={handlePlayAgain}>Start New Game</Button>
        </div>
      </div>
    );
  }

  if (!gameId || roundResults.length === 0 || detailedRoundScores.length === 0) {
    addLog('[FinalResultsPage] Reached render return with missing critical data.');
    return null; 
  }

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      <nav className="sticky top-0 z-50 bg-history-primary text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Logo />
            </div>
            <div className="flex items-center gap-2">
              <NavProfile />
            </div>
          </div>
        </div>
      </nav>
      
      <div className="flex-grow p-4 sm:p-6 md:p-8 pb-36">
        <div className="max-w-4xl mx-auto w-full">
          <FinalScoreSummaryDisplay 
            totalScore={finalScoreData.finalXP} 
            totalPercentage={finalScoreData.finalPercent} 
          />

          <div className="grid gap-6 mb-8">
            {detailedRoundScores.map((score: DetailedRoundScore, index: number) => {
              const imageFromContext = images[index]; 
              if (!imageFromContext) {
                addLog(`[FinalResultsPage] Missing image data for round score at index ${index}`);
                return null; 
              }

              const imageForCard: GameImage = {
                id: score.originalImageId,
                image_url: score.originalImageUrl,
                year: score.originalYear,
                latitude: score.originalLatitude,
                longitude: score.originalLongitude,
                title: imageFromContext.title || `Image ${index + 1}`, 
                location_name: imageFromContext.location_name || 'Unknown Location', 
                description: imageFromContext.description || '' 
              };

              const resultForCard: RoundResult = {
                roundIndex: index,
                imageId: score.originalImageId,
                guessCoordinates: score.originalGuessCoordinates,
                actualCoordinates: { lat: score.originalLatitude, lng: score.originalLongitude },
                distanceKm: score.distanceKm,
                score: score.roundXP, 
                guessYear: score.originalGuessYear,
                xpWhere: score.locationAccuracy?.score || 0,
                xpWhen: score.timeAccuracy?.score || 0,
                accuracy: score.roundPercent,
                hintsUsed: score.originalHintsUsed,
                timeTakenSeconds: roundResults[index]?.timeTakenSeconds || 0 
              };

              return (
                <RoundDetailCard 
                  key={imageForCard.id}
                  image={imageForCard}
                  result={resultForCard}
                  score={score} 
                  isOpen={open[imageForCard.id] || false}
                  onToggleDetails={toggleDetails}
                  index={index}
                />
              );
            })}
          </div>
        </div>

        <div className="max-w-md mx-auto w-full flex flex-row gap-4 px-4 py-6 mt-8 mb-24">
          <Button
            onClick={() => {
              alert("Share functionality coming soon!");
            }}
            variant="outline"
            className="flex-1 border-history-primary text-history-primary hover:bg-history-primary/10 gap-2 py-6 text-base"
            size="lg"
          >
            <Share2 size={20} />
            Share
          </Button>
          <Button
            onClick={handleHome}
            variant="outline"
            className="flex-1 gap-2 py-6 text-base"
            size="lg"
          >
            <Home size={20} />
            Home
          </Button>
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex justify-center items-center border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handlePlayAgain}
          className="w-full max-w-xs bg-history-primary hover:bg-history-primary/90 text-white gap-2 py-6 text-base"
          size="lg"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
};

export default FinalResultsPage;
