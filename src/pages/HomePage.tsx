import React, { useState, useEffect } from 'react';
import { Clock, Award, User, Settings as SettingsIcon } from "lucide-react";
import Popup from '@/components/ui/Popup';
import SettingsTab from '@/components/profile/SettingsTab';
import { useAuth } from '@/contexts/AuthContext';
import { UserSettings, fetchUserSettings, UserProfile, fetchUserProfile } from '@/utils/profile/profileService';
import { GameModeCard } from "@/components/GameModeCard";
import { useGame } from "@/contexts/GameContext"; // Import useGame hook
import GameSettings from "@/components/game/GameSettings"; // Import GameSettings

// Rename component
const HomePage = () => {
  const [isSettingsPopupOpen, setIsSettingsPopupOpen] = useState(false);
  const { user } = useAuth();
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // For profile specific settings if any, or just user id
  const [isLoadingUserSettings, setIsLoadingUserSettings] = useState(false);
  const { startGame, isLoading } = useGame(); // Get startGame function and loading state

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
    // Potentially pass mode to startGame if needed in context
    console.log(`Starting game with mode: ${mode}`);
    if (!isLoading) { // Prevent multiple clicks while loading
      await startGame(); // Settings are already in context, startGame reads them
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 relative">
      {user && (
        <button 
          onClick={() => setIsSettingsPopupOpen(true)} 
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-10"
          aria-label="Open Settings"
        >
          <SettingsIcon className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Game Settings Section */}
      <div className="max-w-3xl mx-auto mb-12">
        <GameSettings />
      </div>

      {/* Game modes section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
        <GameModeCard
          title="Classic"
          description="Test your historical knowledge at your own pace. Perfect for learning and exploring."
          mode="classic"
          icon={User}
          onStartGame={handleStartGame} // Pass handler to the card
          isLoading={isLoading} // Pass loading state
        />
        {/* Add onStartGame and isLoading to other cards if they should also start games */}
        <GameModeCard
          title="Time Attack"
          description="Race against the clock! Make quick decisions about historical events."
          mode="time-attack"
          icon={Clock}
          onStartGame={handleStartGame} // Add handler 
          isLoading={isLoading} // Add loading state
        />
        <GameModeCard
          title="Challenge"
          description="Compete with others in daily challenges and earn achievements."
          mode="challenge"
          icon={Award}
          onStartGame={handleStartGame} // Add handler
          isLoading={isLoading} // Add loading state
        />
      </div>

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