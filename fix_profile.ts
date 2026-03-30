import { createClient } from '@supabase/supabase-js';

const API_KEY = 'sbp_f8634d1e2f10e5a5da6065421645cab260f3ba1b';
const PROJECT_REF = 'ffddohkyuegzywkepfsk';
const SQL_FILE = 'setup_auth.sql';

// Using the provided PAT to authenticate to management API is not direct to DB,
// BUT I can use the supabaseUrl and the SERVICE ROLE KEY we injected in .env!
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing service role keys');
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  const email = 'owner@raketa.uz';
  
  // 1. Get the user from auth.users
  const { data: usersData, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
  if (usersError) throw usersError;
  
  const ownerUser = usersData.users.find(u => u.email === email);
  if (!ownerUser) {
    console.error('Owner user not found!');
    return;
  }
  
  console.log(`Owner found: ${ownerUser.id}. Upserting into profiles...`);
  
  // 2. Insert into profiles
  const { error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert({
      id: ownerUser.id,
      email: ownerUser.email,
      full_name: 'Asoschi',
      role: 'Owner'
    });
    
  if (upsertError) {
    console.error('Upsert Error:', upsertError.message);
  } else {
    console.log('Profile successfully upserted!');
  }
}

main();
