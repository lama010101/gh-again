import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate, useParams } from "react-router-dom";
import { Share2, Loader, Home, MapPin, Calendar, ArrowLeft, Target, Zap } from "lucide-react";
import { useGame } from "@/contexts/GameContext";
import { Badge } from "@/components/ui/badge";
import MainNavbar from "@/components/navigation/MainNavbar";
import { useEffect } from "react";
import { formatInteger } from '@/utils/format';
import { 
  calculateFinalScore,
  calculateTimeAccuracy,
  calculateLocationAccuracy,
  getTimeDifferenceDescription
} from "@/utils/gameCalculations";

const FinalResultsPage = () => {
  const navigate = useNavigate();
  const { 
    images, 
    isLoading: isContextLoading, 
    error: contextError, 
    startGame,
    resetGame,
    roundResults,
    fetchGlobalMetrics
  } = useGame();
  
  // Ensure global score is updated when the final results page is loaded
  useEffect(() => {
    // Fetch updated global metrics after game completion
    fetchGlobalMetrics();
    console.log('Fetched updated global metrics after game completion');
  }, [fetchGlobalMetrics]);

  const handlePlayAgain = async () => {
    resetGame();
    await startGame();
  };

  const handleHome = () => {
    resetGame();
    navigate("/");
  };

  if (isContextLoading) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-12 w-12 animate-spin text-history-primary mx-auto mb-4" />
          <p className="text-lg">Loading final results...</p>
        </div>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="min-h-screen bg-history-light dark:bg-history-dark p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-4">Error Loading Results</h2>
          <p className="mb-6">{contextError}</p>
          <Button
            onClick={() => navigate("/")}
            className="bg-history-primary hover:bg-history-primary/90 text-white"
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

  // Calculate final score using the standardized scoring system
  const roundScores = roundResults.map(result => {
    // If xpWhere and xpWhen are already calculated, use them
    if (result.xpWhere !== undefined && result.xpWhen !== undefined) {
      return {
        roundXP: result.xpWhere + result.xpWhen,
        roundPercent: result.accuracy !== undefined ? result.accuracy : 
          ((result.xpWhere + result.xpWhen) / 200) * 100 // Calculate percentage if not provided
      };
    }
    
    // Otherwise calculate from raw data
    const img = images.find(img => img.id === result.imageId);
    if (!img || result.distanceKm === null || result.guessYear === null) {
      return { roundXP: 0, roundPercent: 0 };
    }
    
    const locationXP = formatInteger(calculateLocationAccuracy(result.distanceKm));
    const timeXP = formatInteger(calculateTimeAccuracy(result.guessYear, img.year));
    
    return {
      roundXP: locationXP + timeXP,
      roundPercent: ((locationXP + timeXP) / 200) * 100
    };
  });
  
  // Calculate final score and percentage
  const { finalXP, finalPercent } = calculateFinalScore(roundScores);
  
  // Use the calculated values
  const totalScore = formatInteger(finalXP);
  const totalPercentage = formatInteger(finalPercent);

  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      {/* Add MainNavbar at the top */}
      <MainNavbar onMenuClick={() => console.log('Menu clicked')} />
      
      <div className="flex-grow p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4 text-history-primary dark:text-history-light">
              Final Score
            </h1>
            <div className="flex justify-center items-center space-x-4 mt-2">
              <span className="font-semibold">Accuracy:</span>
              <Badge variant="accuracy" className="text-lg flex items-center gap-1" aria-label={`Accuracy: ${formatInteger(totalPercentage)}%`}>
                <Target className="h-4 w-4" />
                <span>{formatInteger(totalPercentage)}%</span>
              </Badge>
              <span className="font-semibold">XP:</span>
              <Badge variant="xp" className="text-lg flex items-center gap-1" aria-label={`XP: ${formatInteger(totalScore)}`}>
                <Zap className="h-4 w-4" />
                <span>{formatInteger(totalScore)}</span>
              </Badge>
            </div>
          </div>

        <div className="grid gap-6 mb-8">
          {images.map((image, index) => {
            const result = roundResults?.[index];
            const yearDifference = result?.guessYear && image.year ? 
              Math.abs(result.guessYear - image.year) : 0;
            let roundPercentage = 0;
            if (result?.accuracy !== undefined) {
              roundPercentage = result.accuracy;
            } else if (result?.xpWhere !== undefined && result?.xpWhen !== undefined) {
              roundPercentage = ((result.xpWhere + result.xpWhen) / 200) * 100;
            } else if (result?.distanceKm !== null && result?.guessYear !== null) {
              const locationXP = formatInteger(calculateLocationAccuracy(result.distanceKm || 0));
              const timeXP = formatInteger(calculateTimeAccuracy(result.guessYear || 0, image.year || 0));
              roundPercentage = ((locationXP + timeXP) / 200) * 100;
            }
            // Toggle state for details
            const [open, setOpen] = React.useState(false);
            return (
              <div
                key={image.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
              >
                <div className="flex flex-col md:flex-row">
                  <div className="md:w-1/3">
                    <img
                      src={image.url}
                      alt={`Round ${index + 1} - ${image.title}`}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <div className="p-4 md:w-2/3">
                    <div className="flex justify-between items-start mb-4">
                      <div
                        className="cursor-pointer w-full"
                        onClick={() => setOpen(!open)}
                        tabIndex={0}
                        role="button"
                        aria-expanded={open}
                        aria-controls={`details-${image.id}`}
                      >
                        <h3 className="text-lg font-bold text-history-primary dark:text-history-light">
                          {image.title || ""}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="accuracy" className="flex items-center gap-1" aria-label={`Accuracy: ${formatInteger(roundPercentage)}%`}>
                            <Target className="h-3 w-3" />
                            <span>{formatInteger(roundPercentage)}%</span>
                          </Badge>
                          <Badge variant="xp" className="flex items-center gap-1" aria-label={`XP: ${formatInteger(result?.score || 0)}`}>
                            <Zap className="h-3 w-3" />
                            <span>{formatInteger(result?.score || 0)}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Badge variant="selectedValue" className="text-xs mt-1">
                            {image.location_name} ({image.year})
                          </Badge>
                        </p>
                      </div>
                    </div>
                    {open && (
                      <div className="details" id={`details-${image.id}`}> 
                        <div className="grid grid-cols-2 gap-4 mt-4">
                          <div className="p-3 rounded-lg bg-history-primary/10 dark:bg-history-primary/20">
                            <div className="flex items-center mb-2">
                              <MapPin className="h-4 w-4 mr-1 text-history-primary" />
                              <span className="text-sm font-medium text-history-primary dark:text-history-light">Where</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-history-primary dark:text-history-light">
                                {result?.distanceKm === 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                                ) : (
                                  result?.distanceKm == null ? '? km off' : `${formatInteger(result.distanceKm)} km off`
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="accuracy" className="text-xs flex items-center gap-1" aria-label={`Location Accuracy: ${formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}%`}>
                                  <Target className="h-2 w-2" />
                                  <span>{formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}%</span>
                                </Badge>
                                <Badge variant="xp" className="text-xs flex items-center gap-1" aria-label={`Location XP: ${formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}`}>
                                  <Zap className="h-2 w-2" />
                                  <span>{formatInteger(calculateLocationAccuracy(result?.distanceKm || 0))}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="p-3 rounded-lg bg-history-primary/10 dark:bg-history-primary/20">
                            <div className="flex items-center mb-2">
                              <Calendar className="h-4 w-4 mr-1 text-history-primary" />
                              <span className="text-sm font-medium text-history-primary dark:text-history-light">When</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-history-primary dark:text-history-light">
                                {yearDifference === 0 ? (
                                  <span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>
                                ) : (
                                  yearDifference === 0 ? (<span className="text-green-600 dark:text-green-400 font-medium">Perfect!</span>) : (`${formatInteger(yearDifference)} ${yearDifference === 1 ? 'year' : 'years'} off`)
                                )}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="accuracy" className="text-xs flex items-center gap-1" aria-label={`Time Accuracy: ${formatInteger(calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}%`}>
                                  <Target className="h-2 w-2" />
                                  <span>{formatInteger(calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}%</span>
                                </Badge>
                                <Badge variant="xp" className="text-xs flex items-center gap-1" aria-label={`Time XP: ${formatInteger(result?.xpWhen ?? calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}`}>
                                  <Zap className="h-2 w-2" />
                                  <span>{formatInteger(result?.xpWhen ?? calculateTimeAccuracy(result?.guessYear || 0, image.year || 0))}</span>
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => {
              // Share functionality would go here
              alert("Share functionality coming soon!");
            }}
            variant="outline"
            className="border-history-primary text-history-primary gap-2"
          >
            <Share2 size={16} />
            Share Score
          </Button>
          <Button
            onClick={handlePlayAgain}
            className="bg-history-primary hover:bg-history-primary/90 text-white gap-2"
          >
            <Loader size={16} />
            Play Again
          </Button>
          <Button
            onClick={handleHome}
            variant="secondary"
            className="gap-2"
          >
            <Home size={16} />
            Home
          </Button>
        </div>
      </div>
      </div>
    </div>
  );
};

export default FinalResultsPage; 