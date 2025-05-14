import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Award,
  User,
  Settings,
  ChevronLeft,
  BarChart
} from "lucide-react";
import MainNavbar from '@/components/navigation/MainNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { useGame } from '@/contexts/GameContext';
import { useNavigate } from 'react-router-dom';
import { Badge as BadgeType, BadgeEvaluation } from '@/utils/badges/types';
import { evaluateUserBadges } from '@/utils/badges/badgeService';
import { 
  fetchUserProfile, 
  fetchUserStats, 
  fetchUserSettings, 
  fetchAvatars,
  updateUserAvatar,
  UserProfile,
  UserStats,
  UserSettings,
  UserMetrics
} from '@/utils/profile/profileService';

// Import tab components
import ProfileHeader from '@/components/profile/ProfileHeader';
import StatsTab from '@/components/profile/StatsTab';
import BadgesTab from '@/components/profile/BadgesTab';
import AvatarsTab from '@/components/profile/AvatarsTab';
import SettingsTab from '@/components/profile/SettingsTab';

const ProfileLayout1 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { fetchGlobalMetrics } = useGame();
  
  // Ensure global score is updated when the profile page is loaded
  useEffect(() => {
    // Fetch updated global metrics
    fetchGlobalMetrics();
    console.log('Fetched updated global metrics on profile page');
  }, [fetchGlobalMetrics]);
  
  // State for profile data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [avatars, setAvatars] = useState<{ id: string; name: string; image_url: string }[]>([]);
  const [badgeEvaluations, setBadgeEvaluations] = useState<BadgeEvaluation[]>([]);
  
  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [avatarsLoading, setAvatarsLoading] = useState(true);
  const [badgesLoading, setBadgesLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  
  // Fetch all profile data on component mount
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      
      try {
        // Fetch user profile
        const userProfile = await fetchUserProfile(user.id);
        
        // Check if user has an avatar
        const hasAvatar = !!(userProfile?.avatar_url || userProfile?.avatar_image_url);
        
        // If no avatar, assign one based on their name
        if (!hasAvatar) {
          // No avatar assignment logic available; just set profile as is
          setProfile(userProfile);
        } else {
          setProfile(userProfile);
        }
        
        // For guest users, check localStorage first
        if (user.isGuest) {
          setStatsLoading(true);
          
          // Get user metrics from localStorage
          const storageKey = `user_metrics_${user.id}`;
          const storedMetricsJson = localStorage.getItem(storageKey);
          
          if (storedMetricsJson) {
            try {
              const storedMetrics = JSON.parse(storedMetricsJson);
              
              // Convert stored metrics to UserStats format
              const userStats: UserStats = {
                games_played: storedMetrics.games_played || 0,
                avg_accuracy: storedMetrics.overall_accuracy || 0,
                best_accuracy: storedMetrics.overall_accuracy || 0, // Using the same value since we don't track best separately
                perfect_scores: storedMetrics.perfect_games || 0,
                total_xp: storedMetrics.xp_total || 0,
                global_rank: 0, // Not applicable for guest users
                time_accuracy: storedMetrics.time_accuracy || 0,
                location_accuracy: storedMetrics.location_accuracy || 0,
                challenge_accuracy: 0 // Not tracked separately
              };
              
              setStats(userStats);
              setMetrics(storedMetrics);
              
              // Evaluate badges based on metrics
              const evaluations = await evaluateUserBadges(user.id, storedMetrics);
              setBadgeEvaluations(evaluations);
              setBadgesLoading(false);
            } catch (e) {
              console.error('Error parsing stored metrics for guest user:', e);
              const defaultStats = getDefaultStats();
              setStats(defaultStats);
              setMetrics(getDefaultMetrics(defaultStats));
            }
          } else {
            // No stored metrics found, using defaults
            const defaultStats = getDefaultStats();
            setStats(defaultStats);
            setMetrics(getDefaultMetrics(defaultStats));
          }
          
          setStatsLoading(false);
        } else {
          // For regular users, use Supabase as before
          setStatsLoading(true);
          const userStats = await fetchUserStats(user.id);
          setStats(userStats);
          setStatsLoading(false);
          
          // Use userStats as metrics for badge evaluation
          setBadgesLoading(true);
          const userMetrics = getDefaultMetrics(userStats);
          setMetrics(userMetrics);
          
          // Evaluate badges based on metrics
          const evaluations = await evaluateUserBadges(user.id, userMetrics);
          setBadgeEvaluations(evaluations);
          setBadgesLoading(false);
        }
        
        // For all users, fetch settings and avatars
        setSettingsLoading(true);
        const userSettings = await fetchUserSettings(user.id);
        setSettings(userSettings);
        setSettingsLoading(false);
        
        // Fetch available avatars
        setAvatarsLoading(true);
        const allAvatars = await fetchAvatars();
        setAvatars(allAvatars);
        setAvatarsLoading(false);
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfileData();
  }, [user]);
  
  // Helper functions to generate default stats/metrics (moved from profileService.ts for cleaner access)
  const getDefaultStats = (): UserStats => ({
    games_played: 0,
    avg_accuracy: 0,
    best_accuracy: 0,
    perfect_scores: 0,
    total_xp: 0,
    global_rank: 0,
    time_accuracy: 0,
    location_accuracy: 0,
    challenge_accuracy: 0,
  });
  
  const getDefaultMetrics = (stats?: UserStats): UserMetrics => ({
    games_played: stats?.games_played || 0,
    perfect_rounds: 0,
    perfect_games: stats?.perfect_scores || 0,
    time_accuracy: stats?.time_accuracy || 0,
    location_accuracy: stats?.location_accuracy || 0,
    overall_accuracy: stats?.avg_accuracy || 0,
    win_streak: 0,
    daily_streak: 0,
    xp_total: stats?.total_xp || 0,
    year_bullseye: 0,
    location_bullseye: 0
  });
  
  // Function to refresh all data
  const refreshData = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // For guest users, refresh from localStorage
      if (user.isGuest) {
        const storageKey = `user_metrics_${user.id}`;
        const storedMetricsJson = localStorage.getItem(storageKey);
        
        if (storedMetricsJson) {
          try {
            const storedMetrics = JSON.parse(storedMetricsJson);
            
            // Convert stored metrics to UserStats format
            const userStats: UserStats = {
              gamesPlayed: storedMetrics.games_played || 0,
              avgAccuracy: storedMetrics.overall_accuracy || 0,
              bestAccuracy: storedMetrics.overall_accuracy || 0,
              perfectScores: storedMetrics.perfect_games || 0,
              totalXp: storedMetrics.xp_total || 0,
              globalRank: 0,
              timeAccuracy: storedMetrics.time_accuracy || 0,
              locationAccuracy: storedMetrics.location_accuracy || 0,
              challengeAccuracy: 0
            };
            
            const userProfile = await fetchUserProfile(user.id);
            const userSettings = await fetchUserSettings(user.id);
            const allAvatars = await fetchAvatars();
            
            setProfile(userProfile);
            setStats(userStats);
            setSettings(userSettings);
            setMetrics(storedMetrics);
            setAvatars(allAvatars);
            
            // Evaluate badges based on metrics
            const evaluations = await evaluateUserBadges(user.id, storedMetrics);
            setBadgeEvaluations(evaluations);
          } catch (e) {
            console.error('Error refreshing stored metrics for guest user:', e);
          }
        }
      } else {
        // For regular users, use Supabase
        const [
          userProfile,
          userStats,
          userSettings,
          userMetrics,
          allAvatars
        ] = await Promise.all([
          fetchUserProfile(user.id),
          fetchUserStats(user.id),
          fetchUserSettings(user.id),
          fetchUserMetrics(user.id),
          fetchAvatars()
        ]);
        
        setProfile(userProfile);
        setStats(userStats);
        setSettings(userSettings);
        setMetrics(userMetrics);
        setAvatars(allAvatars);
        
        // Evaluate badges based on metrics
        const evaluations = await evaluateUserBadges(user.id, userMetrics);
        setBadgeEvaluations(evaluations);
      }
    } catch (error) {
      console.error('Error refreshing profile data:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleNavigateBack = () => {
    navigate('/test');
  };
  
  return (
    <div className="min-h-screen bg-history-light dark:bg-history-dark flex flex-col">
      {/* Add MainNavbar at the top */}
      <MainNavbar onMenuClick={() => console.log('Menu clicked')} />
      
      <div className="max-w-4xl mx-auto p-4 pt-8 flex-grow">
        {/* Removed back button and title for cleaner interface */}
        
        {/* Profile Header */}
        <ProfileHeader 
          profile={profile} 
          isLoading={isLoading}
          onEditProfile={() => {/* Handle edit profile */}}
        />
        
        {/* Tabs */}
        <Tabs defaultValue="stats">
          <TabsList className="grid grid-cols-4 mb-8">
            <TabsTrigger value="stats" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <BarChart className="mr-2 h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="badges" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <Award className="mr-2 h-4 w-4" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="avatars" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <User className="mr-2 h-4 w-4" />
              Avatars
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-history-primary data-[state=active]:text-white">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats" className="mt-0">
            <StatsTab stats={stats || {
              gamesPlayed: 0,
              avgAccuracy: 0,
              bestAccuracy: 0,
              perfectScores: 0,
              totalXp: 0,
              globalRank: 0,
              timeAccuracy: 0,
              locationAccuracy: 0,
              challengeAccuracy: 0
            }} isLoading={statsLoading} />
          </TabsContent>
          
          <TabsContent value="badges" className="mt-0">
            <BadgesTab 
              badgeEvaluations={badgeEvaluations} 
              isLoading={badgesLoading} 
            />
          </TabsContent>
          
          <TabsContent value="avatars" className="mt-0">
            <AvatarsTab 
              profile={profile} 
              avatars={avatars} 
              isLoading={avatarsLoading}
              onAvatarUpdated={refreshData}
            />
          </TabsContent>
          
          <TabsContent value="settings" className="mt-0">
            {user && settings && (
              <SettingsTab 
                userId={user.id}
                settings={settings}
                isLoading={settingsLoading}
                onSettingsUpdated={refreshData}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProfileLayout1;
