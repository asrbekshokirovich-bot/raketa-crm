
import { createClient } from '@supabase/supabase-client';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  console.log('Fetching order_items joined with orders...');
  const { data, error } = await supabase
    .from('order_items')
    .select('product_id, quantity, orders!inner(created_at)')
    .gte('orders.created_at', thirtyDaysAgo.toISOString());

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success! Items found:', data.length);
    if (data.length > 0) {
      console.log('First item:', data[0]);
    }
  }

  console.log('\nFetching all order_items...');
  const { data: allItems } = await supabase.from('order_items').select('*').limit(5);
  console.log('All items count (limit 5):', allItems?.length);
  console.log('All items sample:', allItems);
}

test();
