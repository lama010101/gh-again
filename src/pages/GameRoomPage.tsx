import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Copy,
  Check,
  Crown,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface RoomSettings {
  timerEnabled: boolean;
  timerSeconds: number;
  hintsPerGame: number;
}

interface Player {
  id: string;
  name: string;
  avatar: string;
  isReady: boolean;
  isHost: boolean;
}

const GameRoomPage = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('id');
  const invitedFriendId = searchParams.get('invite');
  const { user, continueAsGuest } = useAuth();
  
  const [settings, setSettings] = useState<RoomSettings>({
    timerEnabled: true,
    timerSeconds: 60,
    hintsPerGame: 3
  });
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);

  // Load saved settings when component mounts
  useEffect(() => {
    const savedSettings = localStorage.getItem('friendsGameSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({
          timerEnabled: parsed.timerEnabled ?? true,
          timerSeconds: parsed.timerSeconds ?? 60,
          hintsPerGame: parsed.hintsPerGame ?? 3
        });
      } catch (e) {
        console.error('Error parsing saved settings:', e);
      }
    }
    
    // Initialize with current user as host
    if (user) {
      const displayName = user.type === 'guest' 
        ? user.display_name 
        : user.email?.split('@')[0] || 'Player';
      
      const avatarUrl = user.type === 'guest' 
        ? user.avatar_url || '/default-avatar.png'
        : `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}`;
      
      setPlayers([{
        id: user.id,
        name: displayName,
        avatar: avatarUrl,
        isReady: false,
        isHost: true
      }]);
    }
    
    // If this is an invitation, show a toast
    if (invitedFriendId) {
      toast({
        title: "Game Invitation",
        description: "You've been invited to join this game!",
        variant: "default"
      });
    }
  }, [user, invitedFriendId, toast]);

  const shareRoom = async () => {
    if (!gameId) return;
    
    const url = `${window.location.origin}/test/room?id=${gameId}`;
    
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      
      toast({
        title: "Link copied!",
        description: "Share this link with friends to invite them to the game.",
        variant: "default"
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast({
        title: "Failed to copy link",
        description: "Please try again or manually copy the URL.",
        variant: "destructive"
      });
    }
  };
  
  const toggleReady = () => { /* ... */ };
  
  const checkAllReady = (): boolean => {
    return players.length > 0 && players.every(p => p.isReady);
  };
  
  const beginCountdown = (): void => {
    if (!checkAllReady()) return;
    
    let count = 5;
    setCountdown(count);
    
    const timer = setInterval(() => {
      count--;
      setCountdown(count);
      
      if (count <= 0) {
        clearInterval(timer);
        startGame();
      }
    }, 1000);
  };
  
  const startGame = async () => {
    try {
      if (!gameId) throw new Error('Missing game ID');
      // Update navigation to use dynamic routes if multiplayer uses the same flow
      // If multiplayer is different, keep this or adjust as needed.
      navigate(`/test/game?mode=multi&id=${gameId}`); // Keep /test for now
    } catch (error) { /* ... */ }
  };
  
  const updateTimerSetting = (value: number[]) => { /* ... */ };
  const updateHintSetting = (value: number[]) => { /* ... */ };
  
  const initializeGame = async () => {
    try {
      if (!gameId) return;
      
      // If user is not signed in, sign them in as guest
      if (!user) {
        await continueAsGuest();
      }
      
      // Load saved settings
      const savedSettings = localStorage.getItem('friendsGameSettings') || '{}';
      const settings = JSON.parse(savedSettings);
      
      // Navigate directly to the game - use window.location for a full page reload to avoid router issues
      // Store settings in localStorage first
      localStorage.setItem('gameSettings', JSON.stringify({
        timerEnabled: settings.timerEnabled ?? true,
        timerSeconds: settings.timerSeconds ?? 60,
        hintsPerGame: settings.hintsPerGame ?? 3,
        gameId: gameId
      }));
      
      // Force a hard navigation to ensure we get to the game
      window.location.href = `/test/game?mode=multi&id=${gameId}`;
      
    } catch (error) {
      console.error('Error initializing game:', error);
      toast({
        title: "Error joining game",
        description: "There was an issue joining the game. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializeGame();
  }, [gameId, user, continueAsGuest, navigate, toast]);

  if (!gameId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Game Not Found</h2>
        <p className="text-gray-600 mb-6">The game link is invalid or has expired.</p>
        <Button onClick={() => navigate('/test')}>
          Return to Home
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600">Joining game...</p>
      </div>
    );
  }

  // This should never be reached due to the navigation in useEffect
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-600">Redirecting to game...</p>
    </div>
  );
};

export default GameRoomPage; // Export with new name 