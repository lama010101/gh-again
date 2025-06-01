export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      avatars: {
        Row: { created_at: string; id: string; image_url: string; name: string; };
        Insert: { created_at?: string; id?: string; image_url: string; name: string; };
        Update: { created_at?: string; id?: string; image_url?: string; name?: string; };
      };
      badges: {
        Row: { id: string; name: string; description: string; icon_url: string; created_at: string; };
        Insert: { id?: string; name: string; description: string; icon_url: string; created_at?: string; };
        Update: { id?: string; name?: string; description?: string; icon_url?: string; created_at?: string; };
      };
      friends: {
        Row: { user_id1: string; user_id2: string; status: string; created_at: string; };
        Insert: { user_id1: string; user_id2: string; status: string; created_at?: string; };
        Update: { user_id1?: string; user_id2?: string; status?: string; created_at?: string; };
      };
      game_rounds: {
        Row: { 
          id: string; 
          game_id: string; 
          round_number: number; 
          image_id: string; 
          completed: boolean; 
          created_at: string; 
        };
        Insert: { 
          id?: string; 
          game_id: string; 
          round_number: number; 
          image_id: string; 
          completed?: boolean; 
          created_at?: string; 
        };
        Update: { 
          id?: string; 
          game_id?: string; 
          round_number?: number; 
          image_id?: string; 
          completed?: boolean; 
          created_at?: string; 
        };
      };
      games: {
        Row: {
          id: string;
          user_id?: string | null;
          mode: string;
          created_at?: string;
          completed_at?: string | null;
          total_accuracy?: number | null;
          total_xp?: number | null;
          current_round?: number | null;
          round_count?: number | null;
          score?: number | null;
          guest_id?: string | null;
          created_by?: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          mode: string; // mode is required on insert
          created_at?: string;
          completed_at?: string | null;
          total_accuracy?: number | null;
          total_xp?: number | null;
          current_round?: number | null;
          round_count?: number | null;
          score?: number | null;
          guest_id?: string | null;
          created_by?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          mode?: string;
          created_at?: string;
          completed_at?: string | null;
          total_accuracy?: number | null;
          total_xp?: number | null;
          current_round?: number | null;
          round_count?: number | null;
          score?: number | null;
          guest_id?: string | null;
          created_by?: string | null;
        };
      };
      guesses: { // Placeholder for a potential guesses table
        Row: { id: string; round_id: string; user_id: string; latitude: number; longitude: number; year: number; created_at: string; };
        Insert: { id?: string; round_id: string; user_id: string; latitude: number; longitude: number; year: number; created_at?: string; };
        Update: { id?: string; round_id?: string; user_id?: string; latitude?: number; longitude?: number; year?: number; created_at?: string; };
      };
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
        Insert: Omit<Database['public']['Tables']['images']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['images']['Row']>; // No change needed here, already correct
      };
      profiles: {
        Row: { id: string; user_id: string; display_name: string; avatar_url: string; bio: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; display_name: string; avatar_url: string; bio?: string | null; created_at?: string; };
        Update: { id?: string; user_id?: string; display_name?: string; avatar_url?: string; bio?: string | null; created_at?: string; };
      };
      round_results: {
        Row: {
          id?: string; // Assuming primary key, auto-generated
          game_id: string;
          round_index: number;
          image_id: string;
          guess_latitude?: number | null;
          guess_longitude?: number | null;
          actual_latitude: number;
          actual_longitude: number;
          distance_km?: number | null;
          score?: number | null;
          guess_year?: number | null;
          xp_where?: number | null;
          xp_when?: number | null;
          accuracy?: number | null;
          hints_used?: number | null;
          time_taken_seconds?: number | null;
          user_id?: string | null;
          created_at?: string;
        };
        Insert: {
          id?: string;
          game_id: string;
          round_index: number;
          image_id: string;
          guess_latitude?: number | null;
          guess_longitude?: number | null;
          actual_latitude: number;
          actual_longitude: number;
          distance_km?: number | null;
          score?: number | null;
          guess_year?: number | null;
          xp_where?: number | null;
          xp_when?: number | null;
          accuracy?: number | null;
          hints_used?: number | null;
          time_taken_seconds?: number | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['round_results']['Row']>; // No change needed here, already correct
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
        Insert: Omit<Database['public']['Tables']['settings']['Row'], 'id' | 'created_at'> & { id?: string };
        Update: Partial<Database['public']['Tables']['settings']['Row']>; // No change needed here, already correct
      };
      user_metrics: {
        Row: { user_id: string; total_games_played: number; total_xp: number; average_accuracy: number; updated_at: string; };
        Insert: { user_id: string; total_games_played?: number; total_xp?: number; average_accuracy?: number; updated_at?: string; };
        Update: { user_id?: string; total_games_played?: number; total_xp?: number; average_accuracy?: number; updated_at?: string; };
      };
      // Add other tables as needed, ensuring they are top-level keys here
    };
    Views: {
      [key: string]: {
        Row: Record<string, unknown>;
      };
    };
    Functions: {
      get_random_game_images: { Args: { p_image_count: number }; Returns: Database['public']['Tables']['images']['Row'][]; };
      // Add other functions as needed
    };
  };
};
