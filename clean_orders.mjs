import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://ffddohkyuegzywkepfsk.supabase.co";
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clean() {
  console.log("Fetching all orders to clean...");
  const { data: orders, error: fetchError } = await supabase.from('orders').select('*');
  if (fetchError) {
    console.error("Fetch Error:", fetchError);
    return;
  }
  
  if (!orders || orders.length === 0) {
    console.log("No orders found to delete.");
    return;
  }

  const idsToDelete = orders.map(o => o.id);

  console.log(`Found ${orders.length} total orders. Will delete ${idsToDelete.length} orders.`);

  if (idsToDelete.length > 0) {
    const { data: deleted, error: delError } = await supabase
      .from('orders')
      .delete()
      .in('id', idsToDelete)
      .select();

    if (delError) {
      console.error("Delete Error:", delError);
    } else {
      console.log(`Successfully deleted ${deleted.length} obsolete test orders.`);
    }
  } else {
    console.log("No obsolete orders to delete.");
  }
}
clean();
