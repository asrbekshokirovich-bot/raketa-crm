import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
  const password = 'owner123';
  
  console.log('Creating owner user...');
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: 'Asoschi',
      role: 'Owner'
    }
  });

  if (authError) {
    console.error('Error creating user:', authError.message);
    // Continue if user already exists
  } else {
    console.log('User created:', authData.user.id);
  }
  
  // Wait a bit for the trigger to insert into public.profiles
  await new Promise(res => setTimeout(res, 2000));
  
  console.log('Updating profile to Owner...');
  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ role: 'Owner' })
    .eq('email', email);
    
  if (updateError) {
    console.error('Error updating profile:', updateError.message);
  } else {
    console.log('Successfully set as Owner!');
  }
}

main();
