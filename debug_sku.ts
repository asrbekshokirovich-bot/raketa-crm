import { supabase } from './src/services/supabase';

async function checkSku() {
  const { data, error } = await supabase
    .from('inventory')
    .select('*')
    .eq('sku', 'ICH-44786V');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Result for ICH-44786V:', data);
  }
}

checkSku();
