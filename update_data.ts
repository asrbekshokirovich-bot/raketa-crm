import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

async function main() {
  // 1. Get Bostonliq store ID
  const { data: stores, error: storeErr } = await supabaseAdmin.from('stores').select('id, name').ilike('name', '%Bostonliq%');
  if (storeErr) throw storeErr;
  
  const bostonliq = stores?.[0];
  if (!bostonliq) {
    console.log("Bostonliq store not found");
    return;
  }
  const storeId = bostonliq.id;
  console.log("Found Bostonliq store:", storeId);

  // 2. Update Abulfayz's profile store_id
  const { error: profileErr } = await supabaseAdmin.from('profiles').update({ store_id: storeId }).eq('full_name', 'Abulfayz');
  if (profileErr) console.log("Profile update error:", profileErr);
  else console.log("Abulfayz profile updated to Bostonliq.");

  // 3. Update products store_id
  const productsToUpdate = [
    "Shokalad (Alpen gold)",
    "Milter kunga boqar yog'i (1L)",
    "Lactel milk 1.L",
    "Kartoshka (Sariq)",
    "Coca-Cola (1.5L)"
  ];

  for (const productName of productsToUpdate) {
    const { data: matched, error: getErr } = await supabaseAdmin.from('product_listings').select('id, name').ilike('name', `%${productName.substring(0, 10)}%`);
    
    if (getErr) {
      console.log(`Select error for ${productName}:`, getErr);
    }

    if (matched && matched.length > 0) {
      for (const m of matched) {
        const { error: prodErr } = await supabaseAdmin.from('product_listings').update({ store_id: storeId, author_store_id: storeId }).eq('id', m.id);
        if (prodErr) {
          console.log(`Failed to update ${m.name}:`, prodErr);
        } else {
          console.log(`Updated ${m.name} successfully.`);
        }
      }
    } else {
      console.log(`No match found for ${productName}`);
    }
  }
}

main().catch(console.error);
