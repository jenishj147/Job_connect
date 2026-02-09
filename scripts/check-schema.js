
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vhcijozrirckykjitjon.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoY2lqb3pyaXJja3lraml0am9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mjc3OTgsImV4cCI6MjA4NjEwMzc5OH0.MLpcZMWJJdYycgRFiU9BKYDOUHxXxz45rvjwl1VU74k';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
    console.log("Checking 'jobs' table for 'accepted_by' column...");

    // We try to select the column. If it doesn't exist, Supabase will return an error.
    const { data, error } = await supabase
        .from('jobs')
        .select('accepted_by')
        .limit(1);

    if (error) {
        console.log("❌ Error selecting 'accepted_by':", error.message);
        console.log("   (This confirms the column is likely missing)");
    } else {
        console.log("✅ 'accepted_by' column exists.");
    }

    console.log("\nChecking 'applications' table foreign key behavior...");
    // Harder to check cascade without deleting, but we can check if we can select from it.
    // Real verification of cascade requires an attempt to delete.
}

checkSchema();
