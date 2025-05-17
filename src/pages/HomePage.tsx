import React, { useState, useEffect } from 'react';
import { Clock, Award, User, Settings as SettingsIcon } from "lucide-react";
import Popup from '@/components/ui/Popup';
import SettingsTab from '@/components/profile/SettingsTab';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { GameModeCard } from "@/components/GameModeCard";
import { useGame } from "@/contexts/GameContext";
import { useNavigate } from 'react-router-dom';

// Rename component
const HomePage = () => {
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // For profile specific settings if any, or just user id
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const navigate = useNavigate();
  const gameContext = useGame();
  const { startGame, isLoading } = gameContext || {};

  // Fetch user settings when the component mounts or user changes
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
    // Re-fetch settings after update
    if (user) {
      fetchUserSettings(user.id).then(setUserSettings);
    }
  };

  const handleStartGame = async (mode: string) => {
    console.log(`Starting game with mode: ${mode}`);
    if (!gameContext) {
      console.error('Game context is not available');
      return;
    }
    
    if (!isLoading) {
      try {
        await startGame?.();
        // Navigate to game page after starting the game
        navigate('/game');
      } catch (error) {
        console.error('Error starting game:', error);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Settings Button */}
      <div className="flex justify-end mb-8">
        <button
          onClick={() => setIsSettingsPopupOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-history-primary hover:bg-history-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-history-primary transition-colors"
        >
          <SettingsIcon className="h-5 w-5 mr-2" />
          Settings
        </button>
      </div>

      {/* Game modes section */}
      {gameContext ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <GameModeCard
            title="Classic"
            description="Test your historical knowledge at your own pace. Perfect for learning and exploring."
            mode="classic"
            icon={User}
            onStartGame={handleStartGame}
            isLoading={isLoading}
          />
          <GameModeCard
            title="Time Attack"
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
      ) : (
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
      )}

{user && userSettings && (
        <Popup 
          isOpen={isSettingsPopupOpen} 
          onClose={() => setIsSettingsPopupOpen(false)} 
          ariaLabelledBy="home-settings-popup-title"
        >
          <div className="p-1">
            {/* Using a generic title for the popup, SettingsTab itself has its own header */}
            <h2 id="home-settings-popup-title" className="sr-only">Application Settings</h2> 
            <SettingsTab 
              userId={user.id} 
              settings={userSettings} 
              isLoading={isLoadingUserSettings} 
              onSettingsUpdated={() => {
                handleSettingsUpdated();
                setIsSettingsPopupOpen(false); // Optionally close popup on save
              }}
            />
          </div>
        </Popup>
      )}
    </div>
  );
};

export default HomePage; // Export with new name 