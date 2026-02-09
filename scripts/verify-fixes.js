
const { createClient } = require('@supabase/supabase-js');

// ⚠️ UPDATE THESE WITH YOUR KEYS IF NOT SET
const SUPABASE_URL = 'https://vhcijozrirckykjitjon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoY2lqb3pyaXJja3lraml0am9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mjc3OTgsImV4cCI6MjA4NjEwMzc5OH0.MLpcZMWJJdYycgRFiU9BKYDOUHxXxz45rvjwl1VU74k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verify() {
    console.log("🔍 Verifying Database Fixes...");

    // 1. Check for 'accepted_by' column
    const { error: colError } = await supabase
        .from('jobs')
        .select('accepted_by')
        .limit(1);

    if (colError) {
        console.error("❌ 'accepted_by' column is MISSING in 'jobs' table.");
        console.error("   Reason: " + colError.message);
        console.log("   👉 Please run the SQL script 'fix_job_connect.sql' in Supabase.");
    } else {
        console.log("✅ 'accepted_by' column FOUND.");
    }

    // 2. We cannot easily check for ON DELETE CASCADE via JS client without trying to delete something.
    // We will trust the user ran the SQL if the column exists, as they are in the same script.
    console.log("ℹ️  To verify Delete functionality, please try deleting a job with applicants in the app.");
}

verify();
