
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Define types for our users
export type AuthUser = User & {
  type?: 'auth';
  isGuest?: false;
};

export type GuestUser = {
  id: string;
  type: 'guest';
  isGuest: true;
  display_name: string;
  avatar_url?: string;
};

// Define the shape of our Auth Context
export interface AuthState {
  user: AuthUser | GuestUser | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  isGoogleUser: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<GuestUser>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | GuestUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);

  // Check for existing session on mount
  useEffect(() => {
    console.log("AuthProvider: Initializing auth state");
    
    // First set up auth state listener to ensure we don't miss any auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession ? "Session exists" : "No session");
        
        if (currentSession) {
          // Process auth user data
          const authUser = currentSession.user as AuthUser;
          authUser.type = 'auth';
          authUser.isGuest = false;
          setUser(authUser);
          setSession(currentSession);
          setIsGuest(false);
          
          // Check if user is authenticated via Google
          const isGoogle = currentSession.user.app_metadata?.provider === 'google';
          setIsGoogleUser(isGoogle);
          console.log("User authenticated via Google:", isGoogle);
        } else {
          // Check for guest session when auth session is null
          const guestSession = localStorage.getItem('guestSession');
          if (guestSession) {
            try {
              const guestUser = JSON.parse(guestSession) as GuestUser;
              console.log("Using guest session:", guestUser.id);
              setUser(guestUser);
              setSession(null);
              setIsGuest(true);
              setIsGoogleUser(false);
            } catch (error) {
              console.error("Failed to parse guest session", error);
              localStorage.removeItem('guestSession');
              setUser(null);
              setSession(null);
              setIsGuest(false);
              setIsGoogleUser(false);
            }
          } else {
            setUser(null);
            setSession(null);
            setIsGuest(false);
            setIsGoogleUser(false);
          }
        }
      }
    );

    // Then check for existing session
    const checkSession = async () => {
      setIsLoading(true);

      try {
        // First check for guest session in localStorage
        const guestSession = localStorage.getItem('guestSession');
        if (guestSession) {
          try {
            const guestUser = JSON.parse(guestSession) as GuestUser;
            console.log("Found guest session:", guestUser);
            setUser(guestUser);
            setSession(null);
            setIsGuest(true);
            setIsGoogleUser(false);
          } catch (error) {
            console.error("Failed to parse guest session", error);
            localStorage.removeItem('guestSession');
          }
        }

        // Then check for Supabase auth session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log("Found authenticated session:", session);
          const authUser = session.user as AuthUser;
          authUser.type = 'auth';
          authUser.isGuest = false;
          setUser(authUser);
          setSession(session);
          setIsGuest(false);
          
          // Check if user is authenticated via Google
          const isGoogle = session.user.app_metadata?.provider === 'google';
          setIsGoogleUser(isGoogle);
          console.log("User authenticated via Google:", isGoogle);
        }
      } catch (error) {
        console.error("Failed to get auth session", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    
    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setUser(data.user as AuthUser);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      // User will need to confirm email before being logged in
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = async (): Promise<GuestUser> => {
    try {
      console.log("Starting guest login process");
      setIsLoading(true);

      // Generate a simple display name - would normally come from a pool of names or DB
      const randomName = `Guest${Math.floor(Math.random() * 10000)}`;

      // In a real app, you might fetch a random avatar from your database
      // or use a service like DiceBear to generate one
      const displayName = randomName;

      // Create guest user object
      const guestUser: GuestUser = {
        id: uuidv4(),
        type: 'guest',
        isGuest: true,
        display_name: displayName,
      };

      // Save to localStorage
      localStorage.setItem('guestSession', JSON.stringify(guestUser));
      console.log("Guest session saved to localStorage");

      // Update state
      setUser(guestUser);
      setIsGuest(true);

      return guestUser;
    } catch (error) {
      console.error("Error creating guest user", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      console.log("Initiating Google sign in");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) throw error;
      console.log("Google auth initiated successfully, redirecting...");
      
      // No need to update state here as we're redirecting to OAuth provider
      // State will update on return via Supabase's auth state listener
    } catch (error) {
      console.error("Google sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    setIsLoading(true);
    try {
      if (isGuest) {
        // Clear guest session from localStorage
        localStorage.removeItem('guestSession');
      } else {
        // Sign out from Supabase auth
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setUser(null);
      setIsGuest(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isGuest,
      isGoogleUser,
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      continueAsGuest
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
