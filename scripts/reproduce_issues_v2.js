const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://vhcijozrirckykjitjon.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoY2lqb3pyaXJja3lraml0am9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mjc3OTgsImV4cCI6MjA4NjEwMzc5OH0.MLpcZMWJJdYycgRFiU9BKYDOUHxXxz45rvjwl1VU74k';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Starting reproduction script...");

    try {
        const timestamp = Date.now();
        // 1. Create User A (Employer)
        const emailA = `employer_${timestamp}@example.com`;
        const password = 'password123';
        console.log(`Creating Employer: ${emailA}`);

        const { data: { user: userA }, error: errA } = await supabase.auth.signUp({ email: emailA, password });
        if (errA) throw new Error(`Error creating User A: ${JSON.stringify(errA)}`);
        if (!userA) throw new Error("User A creation failed (no user returned)");

        console.log("User A created:", userA.id);

        // Sign in explicitly
        const { error: signInA } = await supabase.auth.signInWithPassword({ email: emailA, password });
        if (signInA) throw new Error(`SignIn User A failed: ${JSON.stringify(signInA)}`);

        console.log("User A signed in.");

        const { error: profileAError } = await supabase
            .from('profiles')
            .insert({ id: userA.id, username: `Employer_${timestamp}`, full_name: 'Employer A' });

        if (profileAError) console.error("Profile A creation warning:", profileAError);

        // 2. User A creates a job
        console.log("User A creating job...");
        const { data: job, error: jobErr } = await supabase
            .from('jobs')
            .insert({
                title: 'Test Job',
                amount: '100',
                user_id: userA.id,
                status: 'OPEN'
            })
            .select()
            .single();

        if (jobErr) throw new Error(`Error creating job: ${JSON.stringify(jobErr)}`);
        console.log("Job created:", job.id);

        // 3. Create User B (Applicant)
        const emailB = `applicant_${timestamp}@example.com`;
        console.log(`Creating Applicant: ${emailB}`);

        // Sign out A
        await supabase.auth.signOut();

        const { data: { user: userB }, error: errB } = await supabase.auth.signUp({ email: emailB, password });
        if (errB) throw new Error(`Error creating User B: ${JSON.stringify(errB)}`);
        if (!userB) throw new Error("User B creation failed");

        console.log("User B created:", userB.id);

        // Sign in as User B
        const { error: signInB } = await supabase.auth.signInWithPassword({ email: emailB, password });
        if (signInB) throw new Error(`SignIn User B failed: ${JSON.stringify(signInB)}`);

        console.log("User B signed in.");

        const { error: profileBError } = await supabase
            .from('profiles')
            .insert({ id: userB.id, username: `Applicant_${timestamp}`, full_name: 'Applicant B' });

        if (profileBError) console.error("Profile B creation warning:", profileBError);

        // 4. User B applies to the job
        console.log("User B applying to job...");
        const { data: application, error: appErr } = await supabase
            .from('applications')
            .insert({
                job_id: job.id,
                applicant_id: userB.id,
                status: 'PENDING'
            })
            .select()
            .single();

        if (appErr) throw new Error(`Error creating application: ${JSON.stringify(appErr)}`);
        console.log("Application created:", application.id);

        // 5. User A tries to HIRE (Update Application Status)
        console.log("User A attempting to HIRE (Update Application Status)...");
        await supabase.auth.signOut();
        await supabase.auth.signInWithPassword({ email: emailA, password });

        const { error: hireErr } = await supabase
            .from('applications')
            .update({ status: 'APPROVED' })
            .eq('id', application.id);

        if (hireErr) {
            console.error(">>> HIRE FAILED (Expected):", JSON.stringify(hireErr));
        } else {
            console.log(">>> HIRE SUCCESS (Unexpected)");
        }

        // 6. User A tries to DELETE the job
        console.log("User A attempting to DELETE job...");
        const { error: deleteErr } = await supabase
            .from('jobs')
            .delete()
            .eq('id', job.id);

        if (deleteErr) {
            console.error(">>> DELETE FAILED:", JSON.stringify(deleteErr));
        } else {
            console.log(">>> DELETE SUCCESS");
        }

    } catch (err) {
        console.error("Unhandled Error:", err.message);
    }
}

run();
