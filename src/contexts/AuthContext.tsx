
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

// Extend the base User type to include our custom properties
interface CustomUser extends User {
  isGuest?: boolean;
  display_name?: string;
  avatar_url?: string;
}

// The isGuest status is derived from user.user_metadata.is_guest
// and other properties are added for convenience.

// Define the shape of our Auth Context
export interface AuthState {
  user: CustomUser | null;
  session: Session | null;
  isLoading: boolean;
  isGuest: boolean;
  isGoogleUser: boolean;
  signInWithEmail: (email: string, password: string) => Promise<CustomUser | null>;
  signUpWithEmail: (email: string, password: string) => Promise<CustomUser | null>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  continueAsGuest: () => Promise<CustomUser | null>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<CustomUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [isGoogleUser, setIsGoogleUser] = useState<boolean>(false);

  useEffect(() => {
    console.log("AuthProvider: Initializing auth state");
    setIsLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, currentSession) => {
        console.log("Auth state changed. Session:", currentSession ? currentSession.user.id : "No session");
        if (currentSession) {
          const currentUser = currentSession.user as CustomUser;
          currentUser.isGuest = currentUser.user_metadata?.is_guest === true;
          currentUser.display_name = currentUser.user_metadata?.display_name;
          currentUser.avatar_url = currentUser.user_metadata?.avatar_url;
          
          setUser(currentUser);
          setSession(currentSession);
          setIsGuest(currentUser.isGuest);
          setIsGoogleUser(currentUser.app_metadata?.provider === 'google');
          console.log("User set. isGuest:", currentUser.isGuest, "isGoogle:", currentUser.app_metadata?.provider === 'google');
        } else {
          setUser(null);
          setSession(null);
          setIsGuest(false);
          setIsGoogleUser(false);
          console.log("User cleared");
        }
        setIsLoading(false); // Moved here to cover initial load and changes
      }
    );

    // Check initial session state more aligned with onAuthStateChange logic
    // onAuthStateChange will fire with the initial state, but explicit check ensures isLoading is handled.
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!user && !session) { // Only set if not already set by an early onAuthStateChange
        if (initialSession) {
          const currentUser = initialSession.user;
          setUser(currentUser);
          setSession(initialSession);
          setIsGuest(currentUser.user_metadata?.is_guest === true);
          setIsGoogleUser(currentUser.app_metadata?.provider === 'google');
          console.log("Initial session checked. User set. isGuest:", currentUser.user_metadata?.is_guest === true, "isGoogle:", currentUser.app_metadata?.provider === 'google');
        } else {
          console.log("Initial session checked. No user.");
        }
      }
      setIsLoading(false); // Ensure loading is false after initial check
    }).catch(error => {
      console.error("Error checking initial session:", error);
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      if (data.user) {
        const user = data.user as CustomUser;
        user.isGuest = user.user_metadata?.is_guest === true;
        user.display_name = user.user_metadata?.display_name;
        user.avatar_url = user.user_metadata?.avatar_url;
        
        setUser(user);
        setSession(data.session);
        setIsGuest(user.isGuest || false);
        setIsGoogleUser(user.app_metadata?.provider === 'google');
      }
      
      return data.user as CustomUser | null;
    } catch (error) {
      console.error("Error signing in:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_guest: false,
            display_name: email.split('@')[0],
            avatar_url: `https://api.dicebear.com/6.x/adventurer/svg?seed=${email}`
          }
        }
      });

      if (error) throw error;
      
      if (data.user) {
        const user = data.user as CustomUser;
        user.isGuest = false;
        user.display_name = email.split('@')[0];
        user.avatar_url = `https://api.dicebear.com/6.x/adventurer/svg?seed=${email}`;
        
        setUser(user);
        setSession(data.session);
        setIsGuest(false);
        setIsGoogleUser(false);
      }
      
      return data.user as CustomUser | null;
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = async (): Promise<CustomUser | null> => {
    setIsLoading(true);
    try {
      console.log("Continuing as guest...");
      
      // Generate a random guest email
      const guestId = `guest_${uuidv4().substring(0, 8)}`;
      const guestEmail = `${guestId}@guest.example`;
      const guestPassword = uuidv4();
      
      // Sign up the guest user
      const { data, error } = await supabase.auth.signUp({
        email: guestEmail,
        password: guestPassword,
        options: {
          data: {
            is_guest: true,
            display_name: `Guest_${guestId.substring(0, 4)}`,
            avatar_url: `https://api.dicebear.com/6.x/avataaars/svg?seed=${guestId}`
          }
        }
      });
      
      if (error) throw error;
      
      console.log("Guest user created:", data);
      
      // The user is automatically signed in after sign up
      if (!data.user) {
        console.error('No user data returned after sign up');
        return null;
      }
      
      const user = data.user as CustomUser;
      user.isGuest = true;
      user.display_name = data.user.user_metadata?.display_name;
      user.avatar_url = data.user.user_metadata?.avatar_url;
      
      setUser(user);
      setSession(data.session);
      setIsGuest(true);
      setIsGoogleUser(false);
      
      return user;
    } catch (error) {
      console.error("Error continuing as guest:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    setIsLoading(true);
    try {
      console.log("Initiating Google sign in");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) throw error;
      console.log("Google auth initiated successfully, redirecting...");
      
      // No need to update state here as we're redirecting to OAuth provider
      // State will update on return via Supabase's auth state listener
    } catch (error) {
      console.error("Error signing in with Google:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out function
  const signOut = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear user state
      setUser(null);
      setSession(null);
      setIsGuest(false);
      setIsGoogleUser(false);
      
      console.log("Successfully signed out");
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
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
