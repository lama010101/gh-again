import React, { useState, useEffect, useCallback } from "react";
import { useLogs } from "@/contexts/LogContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Zap, Target, Share2, Home } from "lucide-react"; 
import { useGame } from "@/contexts/GameContext";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { NavProfile } from "@/components/NavProfile";
// formatInteger and Badge will be used by FinalScoreSummaryDisplay, ensure they are imported there if not already.
// Game calculation utilities (calculateFinalScore, calculateTimeAccuracy) are now primarily within hooks.
import type { GameImage, RoundResult } from '@/types/game';
import RoundDetailCard from '@/components/RoundDetailCard';
import RoundList from '@/components/RoundList';
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
    if (finalScoreData && user && gameId && !metricsHaveBeenUpdated && detailedRoundScores.length > 0 && roundResults.length > 0) {
      addLog(`[FinalResultsPage] Attempting to update metrics for user: ${user.id}, game: ${gameId}`);

      const totalHintsUsed = roundResults.reduce((acc, r) => acc + r.hintsUsed, 0);
      const isPerfectGame = finalScoreData.finalPercent === 100 && totalHintsUsed === 0;

      const validLocationScores = detailedRoundScores.map(rs => rs.locationAccuracy?.score).filter(s => typeof s === 'number') as number[];
      const averageLocationAccuracy = validLocationScores.length > 0 ? validLocationScores.reduce((a, b) => a + b, 0) / validLocationScores.length : 0;

      const validTimeScores = detailedRoundScores.map(rs => rs.timeAccuracy?.score).filter(s => typeof s === 'number') as number[];
      const averageTimeAccuracy = validTimeScores.length > 0 ? validTimeScores.reduce((a, b) => a + b, 0) / validTimeScores.length : 0;

      const yearBullseye = detailedRoundScores.some(rs => 
        rs.timeAccuracy && 
        typeof (rs.timeAccuracy as any).yearDiff === 'number' && 
        (rs.timeAccuracy as any).yearDiff === 0
      );
      const locationBullseye = detailedRoundScores.some(rs => 
        rs.locationAccuracy && 
        typeof (rs.locationAccuracy as any).distanceKm === 'number' && 
        (rs.locationAccuracy as any).distanceKm === 0
      );

      const gameMetricsUpdate = {
        gameXP: finalScoreData.finalXP,
        gameAccuracy: finalScoreData.finalPercent,
        isPerfectGame: isPerfectGame,
        locationAccuracy: averageLocationAccuracy,
        timeAccuracy: averageTimeAccuracy,
        yearBullseye: yearBullseye,
        locationBullseye: locationBullseye,
        // Supabase function also expects rounds_played and hints_used_total for its own calculations if needed by triggers/functions there
        // but the primary gameMetrics type for profileService.ts doesn't list them. Let's assume profileService handles this if necessary or they are not needed by it directly.
      };

      // Ensure finalXP > 0 condition is still checked if it's a specific business rule for updating metrics
      if (finalScoreData.finalXP > 0) {
        updateUserMetrics(user.id, gameMetricsUpdate, gameId)
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
    }
  }, [finalScoreData, user, gameId, refreshGlobalMetrics, addLog, roundResults, metricsHaveBeenUpdated]);

  const handlePlayAgain = async (): Promise<void> => {
    try {
      resetGame();
      setMetricsHaveBeenUpdated(false); // Reset flag for new game
      navigate('/');
      await startGame('solo');
    } catch (error) {
      addLog(`[FinalResultsPage] Error starting new game: ${error instanceof Error ? error.message : String(error)}`);
      console.error('Error starting new game:', error);
      // Optionally, display an error message to the user here
      // For example, by setting an error state and rendering an error component
    }
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
      
      <div className="flex-grow p-4 sm:p-6 md:p-8 pb-36">
        <div className="max-w-4xl mx-auto w-full">
          <FinalScoreSummaryDisplay 
            totalScore={finalScoreData.finalXP} 
            totalPercentage={finalScoreData.finalPercent} 
          />

          <RoundList 
            detailedRoundScores={detailedRoundScores}
            images={images}
            open={open}
            onToggleDetails={toggleDetails}
            addLog={addLog}
            roundResults={roundResults} // Pass roundResults here
          />
        </div>

        <div className="max-w-md mx-auto w-full flex flex-row gap-4 px-4 py-6 mt-8 mb-24">
          <Button
            onClick={() => {
              alert("Share functionality coming soon!");
            }}
            variant="outline"
            className="flex-1 border-history-primary text-history-primary hover:bg-history-primary/10 gap-2 py-6 text-base" 
            aria-label="Share your game results (feature coming soon)"
            size="lg"
          >
            <Share2 size={20} aria-hidden="true" />
            Share Results
          </Button>
          <Button
            onClick={handleHome}
            variant="outline"
            className="flex-1 gap-2 py-6 text-base" 
            aria-label="Return to the home page"
            size="lg"
          >
            <Home size={20} aria-hidden="true" />
            Go to Home
          </Button>
        </div>
      </div>
      
      <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex justify-center items-center border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handlePlayAgain}
          className="w-full max-w-xs bg-history-primary hover:bg-history-primary/90 text-white gap-2 py-6 text-base" 
          aria-label="Start a new game"
          size="lg"
        >
          Play Again
        </Button>
      </div>
    </div>
  );
};

export default FinalResultsPage;
