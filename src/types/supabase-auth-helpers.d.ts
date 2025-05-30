// Basic type definitions for @supabase/auth-helpers-react
// This is a simplified version to make TypeScript happy

declare module '@supabase/auth-helpers-react' {
  import { SupabaseClient } from '@supabase/supabase-js';
  import { Database } from './supabase';
  import React from 'react';

  export interface User {
    id: string;
    email?: string;
    app_metadata: {
      provider?: string;
      [key: string]: any;
    };
    user_metadata: {
      [key: string]: any;
    };
    aud: string;
    created_at?: string;
  }

  export function useSupabaseClient<T = any>(): SupabaseClient<T>;
  export function useUser(): User | null;
  export function useSession(): any;
}
