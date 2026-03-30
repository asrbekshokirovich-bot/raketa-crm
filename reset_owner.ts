import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetOwner() {
  const email = 'owner@raketa.uz';
  const newPassword = 'owner123Password!';

  console.log(`Resetting password for ${email}...`);

  // 1. Find user
  const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
  if (listError) {
    console.error('List error:', listError);
    return;
  }

  const user = users.find(u => u.email === email);
  if (!user) {
    console.error(`User ${email} not found!`);
    return;
  }

  // 2. Update password
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
    password: newPassword,
    user_metadata: {
        password: newPassword // Also update metadata for our "Password History" feature
    }
  });

  if (error) {
    console.error('Update error:', error);
  } else {
    console.log(`SUCCESS! Password for ${email} has been reset to: ${newPassword}`);
  }
}

resetOwner();
