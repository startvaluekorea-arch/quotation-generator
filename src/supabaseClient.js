import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnbaxppowxsdchgqsbdx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYmF4cHBvd3hzZGNoZ3FzYmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI2MDE3NDAsImV4cCI6MjAyODE3Nzc0MH0.ey3';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
