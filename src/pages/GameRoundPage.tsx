import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import GameLayout1 from "@/components/layouts/GameLayout1";
import { Loader } from "lucide-react";
import { useGame, GuessCoordinates } from '@/contexts/GameContext';
import { useToast } from "@/components/ui/use-toast";
import SubmitGuessButton from '@/components/game/SubmitGuessButton';
import { Button } from '@/components/ui/button';
import { SegmentedProgressBar } from '@/components/ui';
import { ConfirmNavigationDialog } from '@/components/game/ConfirmNavigationDialog';
import { useHint } from '@/hooks/useHint';
import { calculateRoundScore as calculateHintPenalty } from '@/utils/scoring';
import { 
  calculateDistanceKm, 
  calculateRoundScore, 
  calculateTimeXP, 
  calculateLocationXP, 
  ROUNDS_PER_GAME 
} from '@/utils/gameCalculations';

// Rename component
const GameRoundPage = () => {
  const navigate = useNavigate();
  const { roomId, roundNumber: roundNumberStr } = useParams<{ roomId: string; roundNumber: string }>();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);

  const handleNavigateHome = useCallback(() => {
    console.log("Attempting to navigate to /test"); // Added log
    navigate('/test');
    console.log("Called navigate('/test')"); // Added log
  }, [navigate]);

  const confirmNavigation = useCallback((navigateTo: () => void) => {
    setPendingNavigation(() => navigateTo);
    setShowConfirmDialog(true);
  }, []);

  const handleConfirmNavigation = useCallback(() => {
    setShowConfirmDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
    }
  }, [pendingNavigation]);

  const {
    images,
    isLoading: isContextLoading,
    error: contextError,
    roomId: contextRoomId,
    recordRoundResult,
    roundTimerSec,
    totalGameAccuracy,
    totalGameXP
  } = useGame();
  const { toast } = useToast();

  const roundNumber = parseInt(roundNumberStr || '1', 10);
  const currentRoundIndex = roundNumber - 1;

  const [currentGuess, setCurrentGuess] = useState<GuessCoordinates | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedYear, setSelectedYear] = useState(1932);
  const [remainingTime, setRemainingTime] = useState<number>(roundTimerSec > 0 ? roundTimerSec : 300);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(roundTimerSec > 0);
  const [hasTimedOut, setHasTimedOut] = useState<boolean>(false);

  // Get current round's hint usage
  const imageForRound = 
      !isContextLoading && 
      images.length > 0 && 
      !isNaN(roundNumber) && 
      roundNumber > 0 && 
      roundNumber <= images.length
      ? images[currentRoundIndex] 
      : null;
  
  // Extract hintsUsed from the useHint hook
  const { hintsUsed: hintsUsedThisRound } = useHint(imageForRound ? {
    location_name: imageForRound.location_name,
    gps: { lat: imageForRound.latitude, lng: imageForRound.longitude },
    year: imageForRound.year,
    title: imageForRound.title,
    description: imageForRound.description
  } : null);

  // Handle guess submission
  const handleSubmitGuess = useCallback(() => {
    if (!imageForRound) {
      toast({
        title: "Error",
        description: "Cannot submit guess, image data is missing.",
        variant: "destructive",
      });
      return;
    }

    console.log(`Submitting guess for round ${roundNumber}, Year: ${selectedYear}, Coords:`, currentGuess);
    setIsSubmitting(true);
    setIsTimerActive(false);

    try {
      const distance = currentGuess 
        ? calculateDistanceKm(
            currentGuess.lat,
            currentGuess.lng,
            imageForRound.latitude,
            imageForRound.longitude
          ) 
        : null;

      // Calculate scores using the standardized system
      const { timeXP, locationXP, roundXP, roundPercent } = distance !== null 
        ? calculateRoundScore(distance, selectedYear, imageForRound.year) 
        : { timeXP: 0, locationXP: 0, roundXP: 0, roundPercent: 0 };
      
      // Apply hint penalties to the score (10% per hint used)
      const finalScore = calculateHintPenalty(roundXP, hintsUsedThisRound);

      console.log(`Distance: ${distance?.toFixed(2) ?? 'N/A'} km, Location XP: ${locationXP.toFixed(1)}, Time XP: ${timeXP.toFixed(1)}, Round XP: ${roundXP.toFixed(1)}, Hints Used: ${hintsUsedThisRound}, Final Score: ${finalScore}`);

      recordRoundResult(
        {
          guessCoordinates: currentGuess,
          distanceKm: distance,
          score: finalScore,
          guessYear: selectedYear,
          xpWhere: locationXP,
          xpWhen: timeXP,
          accuracy: roundPercent
        },
        currentRoundIndex
      );

      setCurrentGuess(null);
      navigate(`/test/game/room/${roomId}/round/${roundNumber}/results`);
    } catch (error) {
      console.error("Error during guess submission:", error);
      toast({
        title: "Submission Error",
        description: "An error occurred while submitting your guess.",
        variant: "destructive",
      });
    } finally {
      setTimeout(() => setIsSubmitting(false), 300);
    }
  }, [currentGuess, imageForRound, toast, roundNumber, selectedYear, recordRoundResult, currentRoundIndex, navigate, roomId, hintsUsedThisRound]);

  // Handle timer timeout
  const handleTimeout = useCallback(() => {
    if (isSubmitting) return;
    
    console.log("Timer expired. Auto-submitting guess.");
    
    toast({
      title: "Time's Up!",
      description: "Submitting your current guess automatically.",
      variant: "info",
      className: "bg-white/70 text-black border border-gray-200",
    });
    
    // Disable the timer to prevent multiple submissions
    setIsTimerActive(false);
    setHasTimedOut(true);
    
    // Submit the guess
    handleSubmitGuess();
  }, [isSubmitting, handleSubmitGuess]);

  // Reset timer when round changes
  useEffect(() => {
    setRemainingTime(roundTimerSec > 0 ? roundTimerSec : 300);
    setIsTimerActive(roundTimerSec > 0);
    setHasTimedOut(false);
  }, [roundNumber, roundTimerSec]);



  useEffect(() => {
    // Redirect if roomId doesn't match or roundNumber is invalid
    if (!isContextLoading && contextRoomId && roomId !== contextRoomId) {
      console.warn(`URL Room ID (${roomId}) mismatch Context Room ID (${contextRoomId}). Redirecting home.`);
      navigate('/test'); // Or handle appropriately
      return;
    }
    
    if (!isContextLoading && images.length > 0 && (isNaN(roundNumber) || roundNumber <= 0 || roundNumber > images.length)) {
       console.warn(`Invalid round number (${roundNumber}) for image count (${images.length}). Navigating to final page.`);
       navigate(`/test/game/room/${roomId}/final`);
       return;
    }

  }, [roomId, roundNumber, images, isContextLoading, contextRoomId, navigate]);

  const handleMapGuess = (lat: number, lng: number) => {
    console.log(`Guess placed at: Lat ${lat}, Lng ${lng}`);
    setCurrentGuess({ lat, lng });
  };
  // Loading state from context
  if (isContextLoading) {
    return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader className="h-8 w-8 animate-spin text-history-primary" />
          <p className="text-lg">Loading Game...</p>
        </div>
      </div>
    );
  }

  // Error state from context
  if (contextError) {
     return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-red-600 mb-3">Error Loading Game</h2>
          <p className="text-muted-foreground mb-4">{contextError}</p>
          <button 
            onClick={() => confirmNavigation(handleNavigateHome)}
            className="px-4 py-2 bg-history-primary text-white rounded hover:bg-history-primary/90"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }
  
  // Context loaded but no image available for this valid round (shouldn't happen often)
  if (!imageForRound) {
     return (
      <div className="fixed inset-0 bg-gray-100 dark:bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-yellow-600 mb-3">Image Not Found</h2>
          <p className="text-muted-foreground">Could not load image for round {roundNumber}.</p>
           <button 
             onClick={() => confirmNavigation(handleNavigateHome)}
             className="px-4 py-2 bg-history-primary text-white rounded hover:bg-history-primary/90"
           >
             Return Home
           </button>
        </div>
      </div>
    );
  }

  // Render the layout and the separate submit button
  return (
    // Use relative positioning to allow absolute positioning for the button
    <div className="relative w-full min-h-screen flex flex-col">
      {/* Progress bar at the very top */}
      <div className="w-full bg-history-primary absolute top-0 z-50">
        <div className="max-w-7xl mx-auto">
          <SegmentedProgressBar current={roundNumber} total={ROUNDS_PER_GAME} className="w-full" />
        </div>
      </div>

      {/* Main game content */}
      <GameLayout1
        onComplete={handleSubmitGuess}
        gameMode="solo"
        currentRound={roundNumber}
        image={imageForRound}
        onMapGuess={handleMapGuess}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        remainingTime={remainingTime}
        setRemainingTime={setRemainingTime}
        isTimerActive={isTimerActive}
        onNavigateHome={handleNavigateHome}
        onConfirmNavigation={confirmNavigation}
      />

      {/* Submit Guess Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent z-10 flex justify-center">
        <Button
          onClick={handleSubmitGuess}
          disabled={isSubmitting || (roundTimerSec > 0 && remainingTime <= 0)}
          size="lg"
          className={`w-full max-w-md shadow-lg ${
            roundTimerSec > 0 && remainingTime <= 0 ? 'opacity-75 cursor-not-allowed' : ''
          }`}
        >
          {isSubmitting ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            roundTimerSec > 0 && remainingTime <= 0 ? 'Time\'s Up!' : 'Submit Guess'
          )}
        </Button>
      </div>
      {/* Confirmation Dialog */}
      <ConfirmNavigationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmNavigation}
      />
    </div> // Closing tag for the main container
  );
};

export default GameRoundPage; 