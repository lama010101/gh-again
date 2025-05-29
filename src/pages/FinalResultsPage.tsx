import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useLogs } from "@/contexts/LogContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Share2, Home, Target, Zap, Loader } from "lucide-react"; // MapPin, Calendar moved to RoundDetailCard
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/Logo";
import { NavProfile } from "@/components/NavProfile";
import { formatInteger } from '@/utils/format';
import { 
  calculateFinalScore,
  calculateTimeAccuracy,
  // calculateLocationAccuracy, // Now handled within useGame or specific calculation hook if further refactored
  getTimeDifferenceDescription
} from "@/utils/gameCalculations";
import type { GameImage, RoundResult } from '@/types/game'; // Import types from game.ts
import type { Location } from '@/types'; // Import Location from index.ts
import RoundDetailCard from '@/components/RoundDetailCard'; // Import the new component

// Define interfaces for type safety
interface RoundScore {
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

interface GameMetrics {
  gameAccuracy: number;
  gameXP: number;
  isPerfectGame: boolean;
  locationAccuracy: number;
  timeAccuracy: number;
  yearBullseye?: boolean;
  locationBullseye?: boolean;
}

const FinalResultsPage: React.FC = (): JSX.Element | null => {
  const { addLog } = useLogs();
  const navigate = useNavigate();
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

  const handlePlayAgain = async (): Promise<void> => {
    resetGame();
    navigate('/');
    await startGame('solo');
  };

  const handleHome = (): void => {
    navigate('/');
  };

  useEffect(() => {
    if (!isLoading && (!gameId || roundResults.length === 0)) {
      navigate('/');
    }
  }, [isLoading, gameId, roundResults, navigate]);

  // Fetch game metrics when gameId is available
  useEffect(() => {
    if (gameId) {
      // Assuming fetchGlobalMetrics doesn't need arguments based on error
      fetchGlobalMetrics();
    }
  }, [gameId, fetchGlobalMetrics]);

  // Refresh metrics periodically when page is visible
  useEffect(() => {
    let refreshMetricsTimer: number | null = null;
    
    // Function to start the timer
    const startTimer = () => {
      if (gameId) {
        refreshMetricsTimer = window.setInterval(() => {
          try {
            refreshGlobalMetrics();
          } catch (err) {
            console.error('Error refreshing global metrics:', err);
          }
        }, 5000);
      }
    };
    
    // Function to clear the timer
    const clearTimer = () => {
      if (refreshMetricsTimer !== null) {
        clearInterval(refreshMetricsTimer);
        refreshMetricsTimer = null;
      }
    };
    
    // Handle visibility change
    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearTimer();
      } else {
        clearTimer(); // Clear any existing timer first
        startTimer();
      }
    };
    
    // Add event listener for visibility
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Initial start
    if (!document.hidden && gameId) {
      startTimer();
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearTimer();
    };
  }, [refreshGlobalMetrics, gameId]);

  const toggleDetails = useCallback((imageId: string): void => {
    setOpen(prevOpen => ({
      ...prevOpen,
      [imageId]: !prevOpen[imageId]
    }));
  }, []); // setOpen from useState is stable and doesn't need to be in dependencies

  // Memoize roundScores calculation to prevent unnecessary recalculations
  // This now uses the types from the game context directly (image_url, guessCoordinates)
  const validRoundScores = useMemo(() => {
    return roundResults.map((resultFromContext: RoundResult, index: number) => {
      const imageFromContext: GameImage = images[index]; // Assuming images from context has image_url, etc.
      if (!imageFromContext || !resultFromContext) return null;

      const guessLocationFromContext = resultFromContext.guessCoordinates; // e.g., { lat: number, lng: number } | null
      const actualLocation = {
        lat: imageFromContext.latitude,
        lng: imageFromContext.longitude
      };

      let locationAccuracy = { score: 0, distanceKm: 0 };
      if (guessLocationFromContext) {
        try {
          function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
            const R = 6371;
            const dLat = deg2rad(lat2 - lat1);
            const dLon = deg2rad(lon2 - lon1);
            const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
                      Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            return R * c;
          }
          function deg2rad(deg: number): number { return deg * (Math.PI/180); }
          
          const distanceKm = getDistanceFromLatLonInKm(
            guessLocationFromContext.lat,
            guessLocationFromContext.lng,
            actualLocation.lat,
            actualLocation.lng
          );
          const maxDistance = 5000;
          const score = Math.max(0, 100 - Math.min(100, (distanceKm / maxDistance) * 100));
          locationAccuracy = {
            score: Math.round(score),
            distanceKm: Math.round(distanceKm * 10) / 10
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
        // These are based on the structure of RoundScore, ensure resultFromContext has hintsUsed
        hintPenalty: resultFromContext.hintsUsed ? resultFromContext.hintsUsed * 30 : 0,
        hintPenaltyPercent: resultFromContext.hintsUsed ? (resultFromContext.hintsUsed * 30) / 2 : 0, // Assuming 30% per hint, max 2 hints for 100% penalty on one aspect
        // Store original context data for mapping to RoundDetailCard later
        originalImageId: imageFromContext.id,
        originalImageUrl: imageFromContext.image_url,
        originalYear: imageFromContext.year,
        originalLatitude: imageFromContext.latitude,
        originalLongitude: imageFromContext.longitude,
        originalGuessCoordinates: resultFromContext.guessCoordinates,
        originalGuessYear: resultFromContext.guessYear,
        originalHintsUsed: resultFromContext.hintsUsed
      };
    }).filter(score => score !== null) as RoundScore[];
  }, [roundResults, images]);

  // Memoize finalScoreData calculation
  const finalScoreData = useMemo(() => {
    if (!validRoundScores || validRoundScores.length === 0) {
      return { finalXP: 0, finalPercent: 0, totalHintPenalty: 0, totalHintPenaltyPercent: 0, roundScores: [] };
    }
    return calculateFinalScore(validRoundScores);
  }, [validRoundScores]);

  // Log final score data when it changes
  useEffect(() => {
    if (finalScoreData && finalScoreData.roundScores && finalScoreData.roundScores.length > 0) {
      addLog(`[FinalResultsPage] Final Score Data: ${JSON.stringify({
        roundScores: finalScoreData.roundScores.map((r: RoundScore, i: number) => ({
          round: i + 1,
          roundXP: r.roundXP,
          roundPercent: r.roundPercent,
          hintPenalty: r.hintPenalty || 0,
          hintPenaltyPercent: r.hintPenaltyPercent || 0
        })),
        finalXP: finalScoreData.finalXP,
        finalPercent: finalScoreData.finalPercent,
        totalHintPenalty: finalScoreData.totalHintPenalty,
        totalHintPenaltyPercent: finalScoreData.totalHintPenaltyPercent
      }, null, 2)}`);
    }
  }, [finalScoreData, addLog]);

  // Hooks must be called before any conditional returns
  // The useEffect for navigation handles the case where gameId or roundResults are missing post-loading

  // Display loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-history-light to-white dark:from-history-dark dark:to-gray-900">
        <Loader className="w-12 h-12 animate-spin text-history-accent mb-4" />
        <p className="text-xl font-medium">Loading results...</p>
      </div>
    );
  }

  // Only show error page if there's a critical error (not metrics-related) and no round results
  if (error && (!roundResults || roundResults.length === 0)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-history-dark to-black">
        <div className="text-amber-400 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Error Loading Results</h1>
        <p className="text-gray-300 mb-6">{error.message || 'Failed to load results'}</p>
        <Button onClick={handleHome} className="bg-gray-600 hover:bg-gray-700">
          Return to Home
        </Button>
      </div>
    );
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

  const totalScore = formatInteger(finalScoreData.finalXP);
  const totalPercentage = formatInteger(finalScoreData.finalPercent);

  if (!gameId || roundResults.length === 0) {
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
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-3 sm:mb-4 text-history-primary dark:text-history-light">
              Final Score
            </h1>
            <div className="flex justify-center gap-6 mb-4">
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="mb-2 text-lg px-3 py-1 border-2 border-history-primary text-history-primary">
                  <Target className="h-4 w-4 mr-1" />
                  {totalPercentage}%
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">Accuracy</span>
              </div>
              <div className="flex flex-col items-center">
                <Badge variant="outline" className="mb-2 text-lg px-3 py-1 border-2 border-history-primary text-history-primary">
                  <Zap className="h-4 w-4 mr-1" />
                  {totalScore}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">Points</span>
              </div>
            </div>
          </div>

          <div className="grid gap-6 mb-8">
            {images.map((imageFromContext: any, index: number) => {
              const resultFromContext: any = roundResults[index];
              const score = validRoundScores[index];
              
              // Ensure resultFromContext and score are defined before rendering card
              if (!resultFromContext || !score) return null;

              // Transform data from validRoundScores (which holds original context structures) 
              // to match RoundDetailCard's expected props (GameImage from game.ts)
              const imageForCard: GameImage = {
                id: score.originalImageId, // Use data stored in score
                image_url: score.originalImageUrl || '', 
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
                timeTakenSeconds: 0 // Default value as we don't have this information
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

        {/* Non-sticky Share and Home Buttons at bottom of content */}
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
      
      {/* Sticky Play Again Button */}
      <div className="fixed bottom-0 left-0 w-full z-50 bg-white/90 dark:bg-gray-900/95 backdrop-blur shadow-[0_-2px_12px_rgba(0,0,0,0.05)] px-4 py-3 flex justify-center items-center border-t border-gray-200 dark:border-gray-700">
        <Button
          onClick={handlePlayAgain}
          className="w-full max-w-xs bg-history-primary hover:bg-history-primary/90 text-white gap-2 py-6 text-base"
          size="lg"
        >
          <Loader size={20} />
          Play Again
        </Button>
      </div>
    </div>
  );
};

export default FinalResultsPage;
