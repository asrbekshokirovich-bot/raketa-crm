import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ffddohkyuegzywkepfsk.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZGRvaGt5dWVnenl3a2VwZnNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQyMzIxNSwiZXhwIjoyMDg5OTk5MjE1fQ.O2yEvsPjZEQczC9Xin3iAt1ZLRiTbQXSQ8wrMFlZlw4';

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  const { data: users, error: fetchErr } = await supabaseAdmin.auth.admin.listUsers();
  if (fetchErr) return console.error(fetchErr);
  
  const user = users.users.find(u => u.email?.includes('sharofiddin'));
  if (!user) return console.log('User not found');
  
  console.log('Found user:', user.email);

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: 'new_password_123'
  });

  if (error) {
    console.error('Update Error:', error);
  } else {
    console.log('Update Success!');
  }
}

main();
