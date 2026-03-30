import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ffddohkyuegzywkepfsk.supabase.co";
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const newListing = {
    sku: 'TEST-123',
    name: 'Test Name',
    price: '1000 UZS',
    description: 'Test description',
    category: 'Tester',
    status: 'Active',
  };

  const { data, error } = await supabase.from('product_listings').insert(newListing).select();
  if (error) {
    console.error("DB Insert Error:", error);
  } else {
    console.log("Insert successful:", data);
    // clean up
    await supabase.from('product_listings').delete().eq('sku', 'TEST-123');
  }
}
check();
