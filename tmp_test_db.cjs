const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://thmjvsetimkvwdwvbgtb.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRobWp2c2V0aW1rdndkd3ZiZ3RiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTY4MDkyOSwiZXhwIjoyMDg3MjU2OTI5fQ.5fkATg2PhSQDMPV3VE2xIKHdZLGOencdr81j-EBDPOo');

async function test() {
    console.log('Fetching levels...');
    const { data, error } = await supabase.from('levels').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Levels:', JSON.stringify(data, null, 2));
    }
    process.exit();
}

test();
