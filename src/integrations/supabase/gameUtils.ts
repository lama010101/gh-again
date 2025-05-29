import { supabase } from './client';
import { GameSettings } from '@/contexts/GameContext';

interface GameDataFromSupabase {
  // Based on the actual Supabase 'games' table schema
  id: string;
  mode: string;
  round_count: number | null;
  score: number | null;
  user_id: string | null;
  created_at: string | null;
  created_by: string | null;
  current_round: number | null;
  guest_id: string | null;
  completed: boolean | null;
}

export async function fetchGameDataFromSupabase(gameId: string): Promise<GameDataFromSupabase> {
  const { data, error } = await supabase
    .from('games')
    .select('id, mode, round_count, score, user_id, created_at, created_by, current_round, guest_id, completed')
    .eq('id', gameId)
    .single();

  if (error || !data) {
    throw new Error(`Game with ID ${gameId} not found or error fetching: ${error?.message}`);
  }

  return data as GameDataFromSupabase;
}
