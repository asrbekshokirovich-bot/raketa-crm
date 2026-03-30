import { supabase } from './src/services/supabase';

async function checkInventory() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .limit(5);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Sample Data:', data);
    console.log('Column Names:', Object.keys(data[0] || {}));
  }
}

checkInventory();
