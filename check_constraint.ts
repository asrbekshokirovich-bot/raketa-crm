import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ffddohkyuegzywkepfsk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZGRvaGt5dWVnenl3a2VwZnNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQyMzIxNSwiZXhwIjoyMDg5OTk5MjE1fQ.O2yEvsPjZEQczC9Xin3iAt1ZLRiTbQXSQ8wrMFlZlw4';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data, error } = await supabaseAdmin.rpc('get_constraints', { table_name: 'profiles' });
  if (error) {
    console.error('Error:', error);
  } else {
    console.log(data);
  }
}
main();
