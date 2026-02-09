const { createClient } = require('@supabase/supabase-js');

// ⚠️ UPDATE THESE WITH YOUR KEYS IF NOT SET
// We try to read from a local .env or hardcoded file if needed, 
// but for now we'll rely on the user having them or editing this file.
// Or we can try to require the existing supabase.js if it exports the client.

// Attempt to import the client from the project source
// Note: This requires the project to have type: commonjs or consistent module usage.
// Since the project is likely ES modules (Expo), we might need to use standard node 'dotenv' pattern.

// Let's assume we can't easily import the React Native `supabase.js` because it uses `AsyncStorage`.
// So we will ask the user to input their keys or we will try to parse them from the file.

const SUPABASE_URL = 'https://vhcijozrirckykjitjon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoY2lqb3pyaXJja3lraml0am9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mjc3OTgsImV4cCI6MjA4NjEwMzc5OH0.MLpcZMWJJdYycgRFiU9BKYDOUHxXxz45rvjwl1VU74k';

if (SUPABASE_URL === "YOUR_SUPABASE_URL") {
    console.error("❌ Please edit scripts/verify-supabase.js and add your Supabase URL and Key.");
    console.log("   (You can find them in your project settings or in your existing supabase.js code)");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function check() {
    console.log("🔍 Checking Supabase Connection...");

    // 1. Check Profiles
    const { data: profiles, error: profileError } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
    if (profileError) {
        console.error("❌ Error accessing 'profiles' table:", profileError.message);
        if (profileError.code === '42P01') console.log("   👉 Table 'profiles' might be missing.");
    } else {
        console.log(`✅ 'profiles' table accessible. Row count: ${profiles ? profiles.length : 'Unknown'}`);
    }

    // 2. Check Jobs
    const { data: jobs, error: jobError } = await supabase.from('jobs').select('count', { count: 'exact', head: true });
    if (jobError) {
        console.error("❌ Error accessing 'jobs' table:", jobError.message);
    } else {
        console.log(`✅ 'jobs' table accessible. Row count: ${jobs ? jobs.length : 'Unknown'}`);
    }

    // 3. Check Relationship (MOST CRITICAL)
    console.log("🔍 Testing Foreign Key Relationship (jobs -> profiles)...");
    const { data: relationData, error: relationError } = await supabase
        .from('jobs')
        .select('id, title, profiles(id, username)')
        .limit(1);

    if (relationError) {
        console.error("❌ Relationship Query Failed:", relationError.message);
        console.log("   👉 This means Supabase doesn't know that 'jobs.user_id' links to 'profiles.id'.");
        console.log("   👉 Fix: You need to set up a Foreign Key constraint.");
    } else {
        console.log("✅ Relationship Query Success!");
        if (relationData.length > 0) {
            console.log("   Sample Data:", JSON.stringify(relationData[0], null, 2));
            if (!relationData[0].profiles) {
                console.warn("   ⚠️ Query worked, but 'profiles' returned null. This might be orphaned data or bad Foreign Key.");
            }
        } else {
            console.log("   (No jobs found to verify data integrity)");
        }
    }

    // 4. Test RLS (Simulated)
    console.log("🔍 Note on RLS: We cannot fully test RLS from this script without a user session.");
    console.log("   If you see 'Delete Failed' in the app, it is 99% an RLS policy issue.");
}

check();
