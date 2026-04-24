// Supabase is optional — the app runs in local mode if env vars are not set.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/** REST API base — only meaningful when Supabase is configured */
export const apiUrl = supabaseUrl
  ? `${supabaseUrl}/functions/v1/parking-slots`
  : '';
