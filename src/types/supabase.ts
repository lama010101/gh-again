// Basic Supabase type definitions to satisfy imports
// NOTE: This is a minimal placeholder. In a production environment,
// these types should be generated from your actual Supabase schema.

export type Tables<T extends string = string> = {
  images: {
    Row: {
      id: string;
      id_v2?: string;
      title: string;
      description: string;
      image_url: string;
      latitude: number;
      longitude: number;
      year: number;
      location_name: string;
      region?: string;
      country?: string;
      created_at?: string;
    };
    Insert: Omit<Tables['images']['Row'], 'id' | 'created_at'> & { id?: string };
    Update: Partial<Tables['images']['Row']>;
  };
  settings: {
    Row: {
      id: string;
      value: {
        soundEnabled: boolean;
        timerSeconds: number;
        hintsPerGame: number;
      };
      created_at?: string;
    };
    Insert: Omit<Tables['settings']['Row'], 'id' | 'created_at'> & { id?: string };
    Update: Partial<Tables['settings']['Row']>;
  };
  games: {
    Row: {
      id: string;
      owner_id: string;
      settings: {
        timerSeconds: number;
        hintsPerGame: number;
      };
      created_at?: string;
    };
    Insert: Omit<Tables['games']['Row'], 'id' | 'created_at'> & { id?: string };
    Update: Partial<Tables['games']['Row']>;
  };
  // Add other tables as needed
};

export type Database = {
  public: {
    Tables: Tables;
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      get_random_game_images: {
        Args: { p_image_count: number };
        Returns: Tables['images']['Row'][];
      };
      // Add other functions as needed
    };
  };
};
