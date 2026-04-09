const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function insertUser() {
    console.log("Checking for table and inserting...");
    
    const { data, error } = await supabase
        .from('app_users')
        .insert([
            { 
                full_name: 'Abulfayz Test', 
                phone: '+998 90 123 45 67', 
                role: 'Mijoz' 
            }
        ])
        .select();

    if (error) {
        console.error("Error inserting user:", error.message);
        if (error.message.includes("relation \"public.app_users\" does not exist")) {
            console.log("TABLE DOES NOT EXIST. Please run the SQL in Supabase Dashboard.");
        }
    } else {
        console.log("User inserted successfully:", data);
    }
}

insertUser();
