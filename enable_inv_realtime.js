const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = "https://ffddohkyuegzywkepfsk.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZmZGRvaGt5dWVnenl3a2VwZnNrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQyMzIxNSwiZXhwIjoyMDg5OTk5MjE1fQ.O2yEvsPjZEQczC9Xin3iAt1ZLRiTbQXSQ8wrMFlZlw4";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function enableRealtime() {
  console.log('Enabling Realtime for inventory and products tables...');
  
  const sql = `
    DO $$ 
    BEGIN 
      -- Check and add inventory
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'inventory') THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE public.inventory; 
        RAISE NOTICE 'Added inventory to publication';
      END IF; 
      
      -- Check and add products
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products') THEN 
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products; 
        RAISE NOTICE 'Added products to publication';
      END IF;
    END $$;
  `;

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    if (error) {
      // If exec_sql with sql_query fails, try with 'sql' parameter (depends on RPC implementation)
      const { error: error2 } = await supabase.rpc('exec_sql', { sql: sql });
      if (error2) throw error2;
    }
    console.log('✅ Real-time enabled successfully.');
  } catch (e) {
    console.error('❌ SQL Error:', e.message);
  }
}

enableRealtime();
