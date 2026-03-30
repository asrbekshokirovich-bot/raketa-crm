import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing service role keys - check VITE_SUPABASE_SERVICE_ROLE_KEY locally');
}

// Bypasses RLS - Only use for Admin-level operations like creating users!
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
