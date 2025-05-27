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
  AlertCircle
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
  const { user } = useAuth();
  
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
  
  if (!gameId) { /* ... Error handling ... */ }
  
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
            <h1 className="text-2xl font-bold">Game Room</h1>
            <p className="text-blue-100">Share the code below to invite friends</p>
            
            <div className="mt-4 flex items-center">
              <div className="bg-white/20 px-4 py-2 rounded-md font-mono text-lg flex-1">
                {gameId}
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                className="ml-2"
                onClick={shareRoom}
              >
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
          
          <div className="p-6">
            {/* Game Settings */}
            <div className="mb-8">
              <h2 className="text-lg font-semibold mb-4">Game Settings</h2>
              
              <div className="space-y-6">
                {/* Timer Setting */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Round Timer: {settings.timerSeconds} seconds
                    </label>
                    <span className="text-sm text-gray-500">
                      {settings.timerEnabled ? 'On' : 'Off'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <Slider
                      value={[settings.timerSeconds]}
                      onValueChange={updateTimerSetting}
                      min={30}
                      max={180}
                      step={5}
                      disabled={!settings.timerEnabled}
                      className="flex-1"
                    />
                  </div>
                </div>
                
                {/* Hints Setting */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                      Hints per Game: {settings.hintsPerGame}
                    </label>
                  </div>
                  <Slider
                    value={[settings.hintsPerGame]}
                    onValueChange={updateHintSetting}
                    min={0}
                    max={10}
                    step={1}
                    className="mt-2"
                  />
                </div>
              </div>
            </div>
            
            {/* Players List */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Players ({players.length})</h2>
                <Button 
                  variant={players.some(p => p.id === user?.id && p.isReady) ? 'default' : 'outline'}
                  onClick={toggleReady}
                  disabled={!user}
                >
                  {players.some(p => p.id === user?.id && p.isReady) ? 'Ready ✓' : 'I\'m Ready'}
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {players.map(player => (
                  <div 
                    key={player.id} 
                    className={`p-4 rounded-lg border ${player.isReady ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center">
                      <div className="relative">
                        <img 
                          src={player.avatar} 
                          alt={player.name}
                          className="h-10 w-10 rounded-full border-2 border-white shadow-sm"
                        />
                        {player.isHost && (
                          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                            <Crown className="h-3 w-3 text-yellow-800" />
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {player.name} {player.id === user?.id && '(You)'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {player.isReady ? 'Ready' : 'Not Ready'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Start Game Button */}
            <div className="flex justify-end">
              <Button 
                onClick={beginCountdown}
                disabled={!checkAllReady() || players.length < 1}
                className="px-8 py-6 text-lg"
              >
                {countdown !== null ? `Starting in ${countdown}...` : 'Start Game'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameRoomPage; // Export with new name 