import { createClient } from '@supabase/supabase-js';

const DEFAULT_URL = 'https://dckkzkjradchewjuodac.supabase.co';
const DEFAULT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRja2t6a2pyYWRjaGV3anVvZGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODU0NTMsImV4cCI6MjEwMTA2MTQ1M30.RYgJyHcf6p5U25tstXeL-507hBHOScXElHBzwdTl7wg';

function getSupabaseUrl() {
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.length > 5) {
      return import.meta.env.VITE_SUPABASE_URL;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_URL;
}

function getSupabaseAnonKey() {
  try {
    if (import.meta && import.meta.env && import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY.length > 5) {
      return import.meta.env.VITE_SUPABASE_ANON_KEY;
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_KEY;
}

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
