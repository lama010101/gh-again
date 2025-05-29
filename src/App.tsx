import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider, useTheme } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GameProvider, useGame } from "@/contexts/GameContext"; // Added useGame
import { LogProvider, useConsoleLogging } from "@/contexts/LogContext";
import { LogWindowModal } from "@/components/LogWindowModal";
import { SystemLogButton } from "@/components/SystemLogButton";

import TestLayout from "./layouts/TestLayout";
import HomePage from "./pages/HomePage";
import GameRoundPage from "./pages/GameRoundPage";
import FinalResultsPage from "./pages/FinalResultsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import ProfilePage from "./pages/ProfilePage";
import SettingsPage from "./pages/SettingsPage";
import GameRoomPage from "./pages/GameRoomPage";
import FriendsPage from "./pages/FriendsPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import AdminImagesPage from "./pages/AdminImagesPage";
import AdminBadgesPage from "./pages/AdminBadgesPage";
import AdminUsersPage from "./pages/AdminUsersPage";
import RoundResultsPage from "./pages/RoundResultsPage";

// Enhanced AuthRedirectHandler with better session handling
const AuthRedirectHandler = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Check for hash fragment which indicates a redirect from OAuth
    const handleAuthRedirect = async () => {
      // Get current URL hash
      const hashParams = window.location.hash;
      
      if (hashParams && hashParams.includes('access_token')) {
        console.log("Detected OAuth redirect with access token");
        
        try {
          // First set the access token from URL into storage
          const accessToken = new URLSearchParams(hashParams.substring(1)).get('access_token');
          if (accessToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: '',
            });
          }
          
          // Then get the session which will now include the token we just set
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error("Error getting session after OAuth redirect:", error);
            return;
          }
          
          if (data?.session) {
            console.log("Successfully retrieved session after OAuth redirect");
            // Scrub the hash so you don't leak tokens in your URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Navigate to home page after successful authentication
            navigate('/test', { replace: true });
          } else {
            console.warn("No session found after OAuth redirect");
          }
        } catch (err) {
          console.error("Failed to process OAuth redirect:", err);
        }
      }
    };
    
    handleAuthRedirect();
  }, [navigate]);
  
  return null;
};

// Component to log game state changes
const GameStateLogger = () => {
  const gameContext = useGame();

  useEffect(() => {
    console.log('[App.tsx] Game state changed:', { 
      timestamp: new Date().toISOString()
    });
  }, [gameContext]);

  return null; // This component doesn't render anything
};

// Component to set up console logging
const ConsoleLogger = () => {
  useConsoleLogging();
  return null;
};

// Component to log theme changes
const ThemeDebugger = () => {
  const { theme, setTheme } = useTheme();
  
  useEffect(() => {
    console.log('Current theme:', theme);
    console.log('Document classes:', document.documentElement.className);
  }, [theme]);
  
  return null;
};

const App = () => {
  const queryClient = new QueryClient();

  return (
    <React.StrictMode>
      <ThemeProvider 
        attribute="class" 
        enableSystem={false}
        disableTransitionOnChange
        defaultTheme="light"
      >
        <ThemeDebugger />
        <QueryClientProvider client={queryClient}>
          <LogProvider>
            <AuthProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <ConsoleLogger />
                <LogWindowModal />
                <SystemLogButton />
                <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
                  <AuthRedirectHandler />
                  <GameProvider>
                    <GameStateLogger />
                    <Routes>
                      <Route path="/test" element={<TestLayout />}>
                        <Route index element={<HomePage />} />
                        <Route path="auth" element={<AuthPage />} />
                        <Route path="leaderboard" element={<LeaderboardPage />} />
                        <Route path="profile" element={<ProfilePage />} />
                        <Route path="settings" element={<SettingsPage />} />
                        <Route path="room" element={<GameRoomPage />} />
                        <Route path="game" element={<Navigate to="/test/game/solo/1" replace />} />
                        <Route path="game/solo/:roundNumber" element={<GameRoundPage mode="solo" />} />
                        <Route path="friends" element={<FriendsPage />} />
                        <Route path="admin" element={<AdminPage />}>
                          <Route index element={<Navigate to="images" replace />} />
                          <Route path="images" element={<AdminImagesPage />} />
                          <Route path="badges" element={<AdminBadgesPage />} />
                          <Route path="users" element={<AdminUsersPage />} />
                        </Route>
                        <Route path="game/multi/:roomId/round/:roundNumber" element={<GameRoundPage mode="multi" />} />
                        <Route path="game/room/:roomId/round/:roundNumber/results" element={<RoundResultsPage />} />
                      </Route>
                      {/* Final Results page with its own MainNavbar */}
                      <Route path="/test/game/room/:roomId/final" element={<FinalResultsPage />} />
                      <Route path="*" element={<Navigate to="/test" replace />} />
                    </Routes>
                  </GameProvider>
                </BrowserRouter>
              </TooltipProvider>
            </AuthProvider>
          </LogProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </React.StrictMode>
  );
};

export default App;
