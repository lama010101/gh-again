import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import type { GameImage as IndexGameImage, RoundResult as IndexRoundResult, Location } from '@/types'; // Import and alias types
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
  const memoizedRoundScores = useMemo(() => {
    return roundResults.map((resultFromContext: any, index: number) => {
      const imageFromContext: any = images[index]; // Assuming images from context has image_url, etc.
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
        hintPenaltyPercent: resultFromContext.hintsUsed ? (resultFromContext.hintsUsed * 30 / 200) * 100 : 0,
        // Store original context data if needed for mapping to RoundDetailCard later
        originalImageId: imageFromContext.id,
        originalGuessCoordinates: resultFromContext.guessCoordinates,
        originalImageUrl: imageFromContext.image_url,
        originalYear: imageFromContext.year,
        originalLatitude: imageFromContext.latitude,
        originalLongitude: imageFromContext.longitude,
        originalGuessYear: resultFromContext.guessYear,
        originalHintsUsed: resultFromContext.hintsUsed
      };
    });
  }, [roundResults, images]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center" role="status" aria-live="polite">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
          <div className="text-lg">Loading your results...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center" role="alert" aria-live="assertive">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Error Loading Results</h2>
          <p className="mb-6">
            {error.message || 'An unexpected error occurred. Please try again.'}
          </p>
          <Button
            onClick={() => navigate("/")}
            className="bg-history-primary hover:bg-history-primary/90 text-white"
            aria-label="Return to home page"
          >
            Return to Home
          </Button>
        </div>
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

  const roundScores = roundResults.map((result, index) => {
    const img = images[index];
    if (!img) return null;

    // Use guessCoordinates instead of guessLocation
    const guessLocation = result.guessCoordinates ? {
      lat: result.guessCoordinates.lat,
      lng: result.guessCoordinates.lng
    } : null;
    
    const actualLocation = {
      lat: img.latitude,
      lng: img.longitude
    };

    // Initialize location accuracy with default values
    let locationAccuracy = { score: 0, distanceKm: 0 };
    
    // Only calculate if we have valid coordinates
    if (guessLocation) {
      try {
        // Calculate distance using Haversine formula for more accurate Earth distance
        function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
          const R = 6371; // Radius of the earth in km
          const dLat = deg2rad(lat2 - lat1);
          const dLon = deg2rad(lon2 - lon1);
          const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
          return R * c; // Distance in km
        }
        
        function deg2rad(deg: number): number {
          return deg * (Math.PI/180);
        }
        
        const distanceKm = getDistanceFromLatLonInKm(
          guessLocation.lat, 
          guessLocation.lng, 
          actualLocation.lat, 
          actualLocation.lng
        );
        
        // Calculate score based on distance (closer = higher score)
        // Max score is 100, min is 0
        // Score decreases as distance increases up to 5000km
        const maxDistance = 5000; // km
        const score = Math.max(0, 100 - Math.min(100, (distanceKm / maxDistance) * 100));
        
        locationAccuracy = {
          score: Math.round(score),
          distanceKm: Math.round(distanceKm * 10) / 10 // Round to 1 decimal place
        };
      } catch (e) {
        console.error('Error calculating location accuracy:', e);
      }
    }
      
    // Create a mock time accuracy result to handle type issues
    let timeAccuracy = { score: 0 };
    
    // Only calculate if we have a valid year guess
    if (result.guessYear) {
      try {
        // Use the existing calculateTimeAccuracy function
        const timeResult = calculateTimeAccuracy(result.guessYear, img.year);
        // Ensure we have the correct type structure
        timeAccuracy = typeof timeResult === 'number' ? { score: timeResult } : timeResult;
      } catch (e) {
        console.error('Error calculating time accuracy:', e);
      }
    }

    return {
      // Ensure we're using the score properties safely
      roundXP: (locationAccuracy?.score || 0) + (timeAccuracy?.score || 0),
      roundPercent: (((locationAccuracy?.score || 0) + (timeAccuracy?.score || 0)) / 200) * 100,
      locationAccuracy,
      timeAccuracy,
      timeDifference: result.guessYear ? Math.abs(result.guessYear - img.year) : 0,
      distanceKm: locationAccuracy.distanceKm,
      hintPenalty: result.hintsUsed ? result.hintsUsed * 30 : 0,
      hintPenaltyPercent: result.hintsUsed ? (result.hintsUsed * 30 / 200) * 100 : 0
    };
  });

  // Filter out null values and calculate final score
  const validScores = memoizedRoundScores.filter(score => score !== null);
  const { finalXP, finalPercent } = useMemo(() => {
    return calculateFinalScore(validScores.map(score => ({
      roundXP: score.roundXP,
      roundPercent: score.roundPercent,
      hintPenalty: score.hintPenalty,
      hintPenaltyPercent: score.hintPenaltyPercent
    })));
  }, [validScores]);
  
  const totalScore = formatInteger(finalXP);
  const totalPercentage = formatInteger(finalPercent);

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
              const score = memoizedRoundScores[index];
              
              // Ensure resultFromContext and score are defined before rendering card
              if (!resultFromContext || !score) return null;

              // Transform data from memoizedRoundScores (which holds original context structures) 
              // to match RoundDetailCard's expected props (IndexGameImage, IndexRoundResult)
              const imageForCard: IndexGameImage = {
                id: score.originalImageId, // Use data stored in memoizedScore
                url: score.originalImageUrl || '', 
                year: score.originalYear,
                latitude: score.originalLatitude,
                longitude: score.originalLongitude,
              };

              const resultForCard: IndexRoundResult = {
                guessLocation: score.originalGuessCoordinates ? 
                  { lat: score.originalGuessCoordinates.lat, lng: score.originalGuessCoordinates.lng } : 
                  { lat: 0, lng: 0 }, // Default if no guess
                guessYear: score.originalGuessYear,
                hintsUsed: score.originalHintsUsed,
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
