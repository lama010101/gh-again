
import { supabase } from '@/integrations/supabase/client';

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string;
  email?: string;
  created_at: string;
  updated_at?: string;
  avatar_image_url: string;
}

export interface Avatar {
  id: string;
  name: string;
  image_url: string;
  created_at: string;
}

export interface UserStats {
  games_played: number;
  avg_accuracy: number;
  best_accuracy: number;
  perfect_scores: number;
  total_xp: number;
  global_rank: number;
  time_accuracy: number;
  location_accuracy: number;
  challenge_accuracy: number;
}

// Define the structure of the user_metrics table in Supabase
export interface UserMetricsTable {
  id: string;
  user_id: string;
  xp_total: number;
  overall_accuracy: number;
  games_played: number;
  created_at: string;
  updated_at: string;
  best_accuracy?: number;
  perfect_games?: number;
  global_rank?: number;
  time_accuracy?: number;
  location_accuracy?: number;
  challenge_accuracy?: number;
  year_bullseye?: number;
  location_bullseye?: number;
}

export type UserMetricsRecord = Record<string, number>;

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  sound_enabled: boolean;
  notification_enabled: boolean;
  distance_unit: 'km' | 'mi';
  language: string;
}

// Fetch user profile
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  // If userId is not provided, return null early
  if (!userId) {
    console.log('No userId provided for profile fetch');
    return null;
  }
  
  // Check if this is a guest user from localStorage
  const guestSession = localStorage.getItem('guestSession');
  if (guestSession) {
    try {
      const guestUser = JSON.parse(guestSession);
      if (guestUser.id === userId) {
        // Return a simplified profile for guest users
        return {
          id: guestUser.id,
          display_name: guestUser.display_name,
          avatar_url: guestUser.avatar_url || '',
          avatar_image_url: guestUser.avatar_url || 'https://api.dicebear.com/6.x/adventurer/svg?seed=' + userId,
          created_at: new Date().toISOString()
        } as UserProfile;
      }
    } catch (e) {
      console.log('Error parsing guest session:', e);
    }
  }
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data as unknown as UserProfile;
  } catch (error) {
    console.error('Error in fetchUserProfile:', error);
    return null;
  }
}

// Update user avatar
// Find a matching avatar based on user's display name
export async function findMatchingAvatar(displayName: string | undefined, isGuest: boolean = false): Promise<Avatar | null> {
  try {
    if (!displayName) return null;
    
    // Get all available avatars
    const avatars = await fetchAvatars();
    if (avatars.length === 0) return null;
    
    // For guest users, try to find an avatar with 'guest' in the name
    if (isGuest) {
      const guestAvatars = avatars.filter(avatar => 
        avatar.name.toLowerCase().includes('guest'));
      
      if (guestAvatars.length > 0) {
        // Return a random guest avatar
        return guestAvatars[Math.floor(Math.random() * guestAvatars.length)];
      }
    }
    
    // Get the first letter of the display name
    const firstLetter = displayName.charAt(0).toLowerCase();
    
    // Try to find an avatar that starts with the same letter
    const matchingAvatars = avatars.filter(avatar => 
      avatar.name.charAt(0).toLowerCase() === firstLetter);
    
    if (matchingAvatars.length > 0) {
      // Return a random matching avatar
      return matchingAvatars[Math.floor(Math.random() * matchingAvatars.length)];
    }
    
    // If no match found, return a random avatar
    return avatars[Math.floor(Math.random() * avatars.length)];
  } catch (error) {
    console.error('Error in findMatchingAvatar:', error);
    return null;
  }
}

export async function updateUserAvatar(userId: string, avatarId: string, customImageUrl: string | null = null): Promise<boolean> {
  try {
    let imageUrl = customImageUrl;
    
    // If no custom image URL provided, fetch from avatars table
    if (!customImageUrl) {
      const { data: avatarData, error: avatarError } = await supabase
        .from('avatars')
        .select('image_url')
        .eq('id', avatarId)
        .single();
        
      if (avatarError || !avatarData) {
        console.error('Error fetching avatar:', avatarError);
        return false;
      }
      
      imageUrl = avatarData.image_url;
    }
    
    // Update the user profile with the new avatar
    const { error } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: avatarId,
        avatar_image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('Error updating avatar:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserAvatar:', error);
    return false;
  }
}

// Create a new user profile if it doesn't exist
export async function createUserProfileIfNotExists(userId: string, displayName: string): Promise<boolean> {
  try {
    // Check if profile exists
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();
      
    // If profile exists, no need to create one
    if (data) {
      return true;
    }
    
    // If error is not "not found", then something else went wrong
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking profile existence:', fetchError);
      return false;
    }
    
    // Create new profile
    const defaultAvatarUrl = 'https://api.dicebear.com/6.x/adventurer/svg?seed=' + userId;
    
    const { error } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        display_name: displayName,
        avatar_image_url: defaultAvatarUrl,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error creating profile:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in createUserProfileIfNotExists:', error);
    return false;
  }
}

// Fetch available avatars
export async function fetchAvatars(): Promise<Avatar[]> {
  try {
    const { data, error } = await supabase
      .from('avatars')
      .select('*')
      .order('created_at');

    if (error) {
      console.error('Error fetching avatars:', error);
      return [];
    }

    return data as Avatar[];
  } catch (error) {
    console.error('Error in fetchAvatars:', error);
    return [];
  }
}

// Fetch user stats
export async function fetchUserStats(userId: string): Promise<UserStats | null> {
  try {
    const { data, error } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching user stats:', error);
      return null;
    }

    if (!data) return null;
    
    const metrics = data as UserMetricsTable;

    return {
      games_played: metrics.games_played || 0,
      avg_accuracy: metrics.overall_accuracy || 0,
      best_accuracy: metrics.best_accuracy || 0,
      perfect_scores: metrics.perfect_games || 0,
      total_xp: metrics.xp_total || 0,
      global_rank: metrics.global_rank || 0,
      time_accuracy: metrics.time_accuracy || 0,
      location_accuracy: metrics.location_accuracy || 0,
      challenge_accuracy: metrics.challenge_accuracy || 0
    };
  } catch (error) {
    console.error('Error in fetchUserStats:', error);
    return null;
  }
}

/**
 * Updates user metrics in Supabase after a game is completed
 * @param userId The user's ID
 * @param gameMetrics The metrics from the completed game
 * @returns Promise<boolean> indicating success or failure
 */
export async function updateUserMetrics(
  userId: string,
  gameMetrics: {
    gameAccuracy: number;
    gameXP: number;
    isPerfectGame: boolean;
    locationAccuracy: number;
    timeAccuracy: number;
    yearBullseye?: boolean;
    locationBullseye?: boolean;
  }
): Promise<boolean> {
  try {
    // Check if this is a guest user first
    const guestSession = localStorage.getItem('guestSession');
    let isGuestUser = false;
    
    if (guestSession) {
      try {
        const guestUser = JSON.parse(guestSession);
        if (guestUser.id === userId) {
          isGuestUser = true;
        }
      } catch (e) {
        console.error('Error parsing guest session:', e);
      }
    }
    
    // Define a type that includes all possible metrics fields
    type UserMetricsUpsert = {
      user_id: string;
      xp_total: number;
      overall_accuracy: number;
      games_played: number;
      updated_at: string;
      best_accuracy?: number;
      perfect_games?: number;
      global_rank?: number;
      time_accuracy?: number;
      location_accuracy?: number;
      challenge_accuracy?: number;
      year_bullseye?: number;
      location_bullseye?: number;
    };
    
    // Initialize metrics object with required fields
    let metrics: UserMetricsUpsert = {
      user_id: userId,
      xp_total: 0,
      overall_accuracy: 0,
      games_played: 0,
      updated_at: new Date().toISOString()
    };
    
    // For guest users, get existing metrics from localStorage
    if (isGuestUser) {
      console.log('Updating metrics for guest user:', userId);
      const storageKey = `user_metrics_${userId}`;
      const storedMetricsJson = localStorage.getItem(storageKey);
      
      if (storedMetricsJson) {
        try {
          const storedMetrics = JSON.parse(storedMetricsJson);
          const currentGamesPlayed = storedMetrics.games_played || 0;
          const gamesPlayed = currentGamesPlayed + 1;
          
          // Calculate new averages
          const currentTotalAccuracy = (storedMetrics.overall_accuracy || 0) * currentGamesPlayed;
          const newOverallAccuracy = Math.round(
            (currentTotalAccuracy + gameMetrics.gameAccuracy) / gamesPlayed
          );
          
          const currentTimeTotal = (storedMetrics.time_accuracy || 0) * currentGamesPlayed;
          const newTimeAccuracy = Math.round(
            (currentTimeTotal + gameMetrics.timeAccuracy) / gamesPlayed
          );
          
          const currentLocationTotal = (storedMetrics.location_accuracy || 0) * currentGamesPlayed;
          const newLocationAccuracy = Math.round(
            (currentLocationTotal + gameMetrics.locationAccuracy) / gamesPlayed
          );
          
          metrics = {
            ...metrics,
            games_played: gamesPlayed,
            overall_accuracy: Number.isFinite(newOverallAccuracy) ? newOverallAccuracy : 0,
            best_accuracy: Math.max(storedMetrics.best_accuracy || 0, gameMetrics.gameAccuracy),
            perfect_games: (storedMetrics.perfect_games || 0) + (gameMetrics.isPerfectGame ? 1 : 0),
            xp_total: (storedMetrics.xp_total || 0) + gameMetrics.gameXP,
            time_accuracy: Number.isFinite(newTimeAccuracy) ? newTimeAccuracy : 0,
            location_accuracy: Number.isFinite(newLocationAccuracy) ? newLocationAccuracy : 0,
            challenge_accuracy: 0,
            year_bullseye: (storedMetrics.year_bullseye || 0) + (gameMetrics.yearBullseye ? 1 : 0),
            location_bullseye: (storedMetrics.location_bullseye || 0) + (gameMetrics.locationBullseye ? 1 : 0)
          };
        } catch (e) {
          console.error('Error parsing stored metrics for guest user:', e);
          // Initialize new metrics for this guest
          metrics = {
            ...metrics,
            games_played: 1,
            overall_accuracy: gameMetrics.gameAccuracy,
            best_accuracy: gameMetrics.gameAccuracy,
            perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
            xp_total: gameMetrics.gameXP,
            time_accuracy: gameMetrics.timeAccuracy,
            location_accuracy: gameMetrics.locationAccuracy,
            challenge_accuracy: 0,
            global_rank: 0,
            year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
            location_bullseye: gameMetrics.locationBullseye ? 1 : 0
          };
        }
      } else {
        // No stored metrics found, create new metrics
        metrics = {
          ...metrics,
          games_played: 1,
          overall_accuracy: gameMetrics.gameAccuracy,
          best_accuracy: gameMetrics.gameAccuracy,
          perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
          xp_total: gameMetrics.gameXP,
          time_accuracy: gameMetrics.timeAccuracy,
          location_accuracy: gameMetrics.locationAccuracy,
          challenge_accuracy: 0,
          global_rank: 0,
          year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
          location_bullseye: gameMetrics.locationBullseye ? 1 : 0
        };
      }
      
      // Save updated metrics to localStorage
      localStorage.setItem(storageKey, JSON.stringify(metrics));
      console.log(`Successfully updated metrics for guest user ${userId}:`, metrics);
      return true;
    }
    
    // For regular users, get existing metrics from Supabase
    console.log('Updating metrics for registered user:', userId);
    const { data: existingData, error: fetchError } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // No existing record, create new metrics
      metrics = {
        ...metrics,
        games_played: 1,
        overall_accuracy: gameMetrics.gameAccuracy,
        best_accuracy: gameMetrics.gameAccuracy,
        perfect_games: gameMetrics.isPerfectGame ? 1 : 0,
        xp_total: gameMetrics.gameXP,
        time_accuracy: gameMetrics.timeAccuracy,
        location_accuracy: gameMetrics.locationAccuracy,
        challenge_accuracy: 0,
        global_rank: 0,
        year_bullseye: gameMetrics.yearBullseye ? 1 : 0,
        location_bullseye: gameMetrics.locationBullseye ? 1 : 0
      };
    } else if (fetchError) {
      console.error('Error fetching existing metrics:', fetchError);
      return false;
    } else {
      // Update existing metrics
      const metrics_data = existingData as UserMetricsTable;
      const currentGamesPlayed = metrics_data.games_played || 0;
      const gamesPlayed = currentGamesPlayed + 1;
      
      // Calculate new averages using proper floating point precision
      const currentTotalAccuracy = (metrics_data.overall_accuracy || 0) * currentGamesPlayed;
      const newOverallAccuracy = Math.round(
        (currentTotalAccuracy + gameMetrics.gameAccuracy) / gamesPlayed
      );
      
      const currentTimeTotal = (metrics_data.time_accuracy || 0) * currentGamesPlayed;
      const newTimeAccuracy = Math.round(
        (currentTimeTotal + gameMetrics.timeAccuracy) / gamesPlayed
      );
      
      const currentLocationTotal = (metrics_data.location_accuracy || 0) * currentGamesPlayed;
      const newLocationAccuracy = Math.round(
        (currentLocationTotal + gameMetrics.locationAccuracy) / gamesPlayed
      );
      
      // Calculate challenge accuracy (using location accuracy as fallback if no challenge data)
      const currentChallengeTotal = (metrics_data.challenge_accuracy || 0) * currentGamesPlayed;
      const newChallengeAccuracy = metrics_data.challenge_accuracy !== undefined
        ? Math.round((currentChallengeTotal + gameMetrics.locationAccuracy) / gamesPlayed)
        : metrics_data.challenge_accuracy || 0;
      
      metrics = {
        ...metrics,
        games_played: gamesPlayed,
        overall_accuracy: Number.isFinite(newOverallAccuracy) ? newOverallAccuracy : 0,
        best_accuracy: Math.max(metrics_data.best_accuracy || 0, gameMetrics.gameAccuracy),
        perfect_games: (metrics_data.perfect_games || 0) + (gameMetrics.isPerfectGame ? 1 : 0),
        xp_total: (metrics_data.xp_total || 0) + gameMetrics.gameXP,
        time_accuracy: Number.isFinite(newTimeAccuracy) ? newTimeAccuracy : 0,
        location_accuracy: Number.isFinite(newLocationAccuracy) ? newLocationAccuracy : 0,
        challenge_accuracy: Number.isFinite(newChallengeAccuracy) ? newChallengeAccuracy : 0,
        year_bullseye: (metrics_data.year_bullseye || 0) + (gameMetrics.yearBullseye ? 1 : 0),
        location_bullseye: (metrics_data.location_bullseye || 0) + (gameMetrics.locationBullseye ? 1 : 0)
      };
    }

    // Upsert the metrics to Supabase
    console.log(`Updating metrics for user ${userId}:`, metrics);
    
    const { error: upsertError } = await supabase
      .from('user_metrics')
      .upsert(metrics, { onConflict: 'user_id' });

    if (upsertError) {
      console.error('Error updating user metrics:', upsertError);
      return false;
    }

    // Verify the update by fetching the latest metrics
    const { data: verifyData, error: verifyError } = await supabase
      .from('user_metrics')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (verifyError) {
      console.error('Error verifying metrics update:', verifyError);
    } else {
      console.log(`Successfully updated metrics for user ${userId}:`, verifyData);
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserMetrics:', error);
    return false;
  }
}

// Fetch user settings
export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('id', userId)
      .single();

    if (error) {
      // If settings don't exist, return default settings
      if (error.code === 'PGRST116') {
        const defaultSettings: UserSettings = {
          theme: 'system',
          sound_enabled: true,
          notification_enabled: true,
          distance_unit: 'km',
          language: 'en'
        };
        return defaultSettings;
      }
      
      console.error('Error fetching user settings:', error);
      return null;
    }

    // Add type assertion and handle potential JSON parsing
    const settings = data.value as unknown;
    return settings as UserSettings;
  } catch (error) {
    console.error('Error in fetchUserSettings:', error);
    return null;
  }
}

// Update user settings
export async function updateUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  try {
    // Check if settings exist for this user
    const { data, error: fetchError } = await supabase
      .from('settings')
      .select('id')
      .eq('id', userId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Error checking settings existence:', fetchError);
      return false;
    }
    
    // If settings exist, update them
    if (data) {
      // Convert settings to a JSON-compatible format
      const settingsJson = JSON.parse(JSON.stringify(settings));
      
      const { error } = await supabase
        .from('settings')
        .update({ 
          value: settingsJson,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId) as { error: any };
        
      if (error) {
        console.error('Error updating settings:', error);
        return false;
      }
    }
    // If settings don't exist, insert them
    else {
      // Convert settings to a JSON-compatible format
      const settingsJson = JSON.parse(JSON.stringify(settings));
      
      const { error } = await supabase
        .from('settings')
        .insert({
          id: userId,
          value: settingsJson,
          updated_at: new Date().toISOString()
        }) as { error: any };
        
      if (error) {
        console.error('Error creating settings:', error);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in updateUserSettings:', error);
    return false;
  }
}
