import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vhcijozrirckykjitjon.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoY2lqb3pyaXJja3lraml0am9uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1Mjc3OTgsImV4cCI6MjA4NjEwMzc5OH0.MLpcZMWJJdYycgRFiU9BKYDOUHxXxz45rvjwl1VU74k';

export const supabase = createClient(supabaseUrl, supabaseKey);