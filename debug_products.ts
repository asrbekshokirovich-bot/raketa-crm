import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ffddohkyuegzywkepfsk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZGRvaGt5dWVnenl3a2VwZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMyMTUsImV4cCI6MjA4OTk5OTIxNX0.8i1POMsCtAxZnLzFuwValTgBGbwqutgLs_7cNxEnzOU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
  console.log('Checking table "products"...');
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample Product:', data);
    console.log('Column Names:', Object.keys(data[0] || {}));
  }
}

checkProducts();
