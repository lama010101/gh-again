import React, { useState, useEffect } from 'react';
import { Clock, Award, User } from "lucide-react";
import GlobalSettingsModal from '@/components/GlobalSettingsModal';
import FriendsGameModal from '@/components/FriendsGameModal';
import { AuthModal } from '@/components/AuthModal';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { GameModeCard } from "@/components/GameModeCard";
import { useGame } from "@/contexts/GameContext";
import type { GameSettings } from '@/types/game'; // Import GameSettings
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const HomePage = () => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // For profile specific settings if any, or just user id
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingMode, setPendingMode] = useState<string | null>(null);
  const [isFriendsModalOpen, setIsFriendsModalOpen] = useState(false);
  const navigate = useNavigate();
  const { startGame, isLoading } = useGame();
  const { toast } = useToast();

  useEffect(() => {
    const loadUserSettings = async () => {
      if (user) {
        setIsLoadingUserSettings(true);
        try {
          const settings = await fetchUserSettings(user.id);
          setUserSettings(settings);
          const userProfile = await fetchUserProfile(user.id); // Potentially needed for other settings aspects or just to confirm user
          setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching user settings for popup:", error);
          // Handle error, maybe set default settings
        }
        setIsLoadingUserSettings(false);
      }
    };
    loadUserSettings();
  }, [user]);

  const handleSettingsUpdated = () => {
    if (user) {
      fetchUserSettings(user.id).then(setUserSettings);
    }
  };

  const handleStartGame = async (mode: string) => {
    console.log('handleStartGame called with mode:', mode);
    
    // Check if user is authenticated (either guest or registered)
    if (!user) {
      console.log('No user found, showing auth modal');
      setPendingMode(mode);
      setShowAuthModal(true);
      return;
    }

    if (mode === 'time-attack') {
      console.log('Time attack mode selected, showing friends modal');
      setIsFriendsModalOpen(true);
      return;
    }
    
    if (!isLoading) {
      console.log('Starting game...');
      try {
        // Check if startGame is defined
        if (!startGame) {
          throw new Error('startGame function is not defined in game context');
        }
        
        console.log('Calling startGame()...');
        // Map 'classic' to 'solo' for the GameContext's startGame function
        const gameContextMode = mode === 'classic' ? 'solo' : mode === 'time-attack' ? 'multi' : 'solo'; 
        // For 'challenge' or other modes, default to 'solo' for now
        
        console.log(`Starting ${gameContextMode} game...`);
        // Call startGame with the mode as the first argument
        await startGame(undefined, { mode: gameContextMode });
        console.log('startGame() completed');
        
        // The startGame function will handle navigation to the first round
        
      } catch (error) {
        // Ensure we extract a readable message from any type of error
        let errorMsg = 'Failed to start the game';
        if (error instanceof Error) {
          errorMsg = error.message;
        } else if (typeof error === 'object' && error !== null) {
          // Handle cases where the error is an object with a message property
          const errorObj = error as any;
          if (errorObj.message) {
            errorMsg = errorObj.message;
          } else if (errorObj.error && errorObj.error.message) {
            errorMsg = errorObj.error.message;
          } else {
            // If we can't extract a specific message, stringify the error object properly
            try {
              errorMsg = JSON.stringify(error);
            } catch (e) {
              errorMsg = 'Error details could not be displayed';
            }
          }
        }
        
        console.error('Error starting game:', error);
        toast({
          title: "Game Loading Error",
          description: errorMsg,
          variant: "destructive"
        });
      }
    } else {
      console.log('Game is already loading, ignoring start request');
    }
  };
  
  const handleStartFriendsGame = (settings: { timerSeconds: number; hintsPerGame: number }) => {
    setIsFriendsModalOpen(false);
    
    // Check if user is authenticated (either guest or registered)
    if (!user) {
      setPendingMode('time-attack');
      setShowAuthModal(true);
      return;
    }
    
    if (!isLoading) {
      try {
        startGame?.('multi', undefined, settings);
        navigate('/game');
      } catch (error) {
        console.error('Error starting friends game:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to start the game. Please try again.",
        });
      }
    }
  };


  const handleAuthSuccess = async () => {
    setShowAuthModal(false);
    if (pendingMode) {
      await handleStartGame(pendingMode);
      setPendingMode(null);
    }
  };

  const handleGuestContinue = async () => {
    setShowAuthModal(false);
    if (pendingMode) {
      // After guest login, start the game using the pending mode
      await handleStartGame(pendingMode);
      setPendingMode(null);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-history-primary to-history-secondary text-white">
      <div className="container mx-auto px-4 py-12">
        {/* Removed Settings Button */}

      {/* Game instructions, settings, etc. */}
      <div className="my-4"></div>
      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto"></div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto mt-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg p-6 shadow">
                  <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto mb-4"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mx-auto mb-4"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <GameModeCard
            title="Solo"
            description="Test your historical knowledge at your own pace. Perfect for learning and exploring."
            mode="classic"
            icon={User}
            onStartGame={handleStartGame}
            isLoading={isLoading}
          />
          <GameModeCard
            title="Friends"
            description="Race against the clock! Make quick decisions about historical events."
            mode="time-attack"
            icon={Clock}
            onStartGame={handleStartGame}
            isLoading={isLoading}
          />
          <GameModeCard
            title="Challenge"
            description="Compete with others in daily challenges and earn achievements."
            mode="challenge"
            icon={Award}
            onStartGame={handleStartGame}
            isLoading={isLoading}
          />
        </div>
      )}

      <GlobalSettingsModal 
        isOpen={isSettingsModalOpen} 
        onClose={() => setIsSettingsModalOpen(false)} 
      />
      
      <FriendsGameModal
        isOpen={isFriendsModalOpen}
        onClose={() => setIsFriendsModalOpen(false)}
        onStartGame={handleStartFriendsGame}
        isLoading={isLoading}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setPendingMode(null);
        }}
        onAuthSuccess={() => {
          // This will be handled by the pending mode logic in handleAuthSuccess
          setShowAuthModal(false);
        }}
        onGuestContinue={handleGuestContinue}
      />
</div>
    </div>
  );
};

export default HomePage; // Export with new name 