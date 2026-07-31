import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jnbaxppowxsdchgqsbdx.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuYmF4cHBvd3hzZGNoZ3FzYmR4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2NzMzNDAsImV4cCI6MjA5MTI0OTM0MH0.wYyA6k5xi4Dr4VEq604JKWuXQGzZdCWF8QGmmlJnoZI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
