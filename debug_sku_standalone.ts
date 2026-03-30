import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ffddohkyuegzywkepfsk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZGRvaGt5dWVnenl3a2VwZnNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjMyMTUsImV4cCI6MjA4OTk5OTIxNX0.8i1POMsCtAxZnLzFuwValTgBGbwqutgLs_7cNxEnzOU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSku() {
  console.log('Checking SKU: ICH-44786V...');
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('sku', 'ICH-44786V');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result for ICH-44786V:', JSON.stringify(data, null, 2));
    
    if (data && data.length > 0) {
      console.log('Column Names:', Object.keys(data[0]));
    } else {
      console.log('No data found for this SKU. Listing first 5 items from inventory:');
      const { data: allData } = await supabase.from('inventory').select('sku, name').limit(5);
      console.log(allData);
    }
  }
}

checkSku();
