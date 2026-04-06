import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jgempeynxznmfwnwxmnp.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnZW1wZXlueHpubWZ3bnd4bW5wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0NzkwNTYsImV4cCI6MjA5MTA1NTA1Nn0.gYR6xyvZvdqwik0hFy9Ecw_s34aZzzJXt8wmhiY37ao';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
