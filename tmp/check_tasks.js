
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTaskItems() {
    console.log('Checking task_items count...');
    const { count, error } = await supabase
        .from('task_items')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        console.error('Error fetching count:', error);
    } else {
        console.log('Total task_items count:', count);
    }
}

checkTaskItems();
