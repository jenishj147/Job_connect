-- RUN THIS SCRIPT IN SUPABASE SQL EDITOR

-- 1. Add missing column 'accepted_by' to 'jobs' table
-- This is critical for the "Hire This Person" functionality
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES public.profiles(id);

-- 2. Fix 'applications' Foreign Key Constraint to include ON DELETE CASCADE
-- This is critical for the "Delete Job" functionality (so applications are deleted with the job)

DO $$
BEGIN
    -- Try to drop constraint by standard name if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'applications_job_id_fkey' 
        AND table_name = 'applications'
    ) THEN
        ALTER TABLE public.applications DROP CONSTRAINT applications_job_id_fkey;
    END IF;

    -- Add the constraint back with CASCADE
    ALTER TABLE public.applications
        ADD CONSTRAINT applications_job_id_fkey
        FOREIGN KEY (job_id)
        REFERENCES public.jobs(id)
        ON DELETE CASCADE;
END $$;
