import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { useGame } from "@/contexts/GameContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Copy,
  Check,
  Crown,
  AlertCircle,
  Loader2,
  UsersRound
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const GameRoomPage = () => {
  const [searchParams] = useSearchParams();
  const gameId = searchParams.get('id');
  const { user, continueAsGuest } = useAuth();
  const gameContext = useGame();
  const { startGame } = gameContext || {};
  const [isLoading, setIsLoading] = useState(true);
  const [gameIdInput, setGameIdInput] = useState('');
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle direct game link access
  useEffect(() => {
    const initializeGame = async () => {
      try {
        if (!gameId) {
          setIsLoading(false);
          return;
        }
        
        // If user is not signed in, sign them in as guest
        if (!user) {
          await continueAsGuest();
        }
        
        // Load saved settings
        const savedSettings = localStorage.getItem('friendsGameSettings') || '{}';
        const settings = JSON.parse(savedSettings);
        
        // Store settings in localStorage
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
        setIsLoading(false);
      }
    };

    initializeGame();
  }, [gameId, user, continueAsGuest, toast]);

  // Copy game link to clipboard
  const copyGameLink = async () => {
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

  // Handle joining a game with ID
  const handleJoinGame = () => {
    if (!gameIdInput.trim()) {
      toast({
        title: "Game ID required",
        description: "Please enter a valid game ID to join.",
        variant: "destructive"
      });
      return;
    }
    
    navigate(`/test/room?id=${gameIdInput}`);
  };

  // Return home button
  const goHome = () => {
    navigate('/test');
  };

  if (!gameId) {
    // No game ID - show join game form
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Join a Game</CardTitle>
            <CardDescription className="text-center">Enter a game ID to join</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <Input 
                placeholder="Enter game ID" 
                value={gameIdInput} 
                onChange={(e) => setGameIdInput(e.target.value)} 
              />
              <Button onClick={handleJoinGame} className="w-full">
                Join Game
              </Button>
              <Button variant="outline" onClick={goHome} className="w-full">
                Return Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600">Loading game room...</p>
      </div>
    );
  }

  // This should never be reached due to the navigation in useEffect
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
      <p className="text-gray-600">Loading game room...</p>
    </div>
  );
};

export default GameRoomPage; // Export with new name 