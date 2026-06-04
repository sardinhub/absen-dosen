import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = 
  supabaseUrl && 
  supabaseUrl !== 'your_supabase_project_url' && 
  supabaseAnonKey && 
  supabaseAnonKey !== 'your_supabase_anon_key';

// Only create a client if fully configured
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
