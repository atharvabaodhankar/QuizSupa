-- Add student info columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- Update test_attempts table to use student_id
ALTER TABLE public.test_attempts 
DROP COLUMN IF EXISTS user_id CASCADE;

ALTER TABLE public.test_attempts 
DROP COLUMN IF EXISTS student_id CASCADE;

ALTER TABLE public.test_attempts 
ADD COLUMN student_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view attempts for their tests" ON public.test_attempts;
DROP POLICY IF EXISTS "Students can view their own attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Students can create attempts" ON public.test_attempts;
DROP POLICY IF EXISTS "Students can update their own attempts" ON public.test_attempts;

-- Drop test policies
DROP POLICY IF EXISTS "Teachers can view tests" ON public.tests;
DROP POLICY IF EXISTS "Students can view published tests" ON public.tests;
DROP POLICY IF EXISTS "Teachers can update their own tests" ON public.tests;

-- Create profile policies
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Teachers can view all profiles"
    ON public.profiles FOR SELECT
    USING (auth.jwt()->>'role' = 'teacher');

-- Create test policies
CREATE POLICY "Teachers can view tests"
    ON public.tests FOR SELECT
    USING (auth.jwt()->>'role' = 'teacher');

CREATE POLICY "Students can view published tests"
    ON public.tests FOR SELECT
    USING (
        is_published = true 
        OR 
        created_by = auth.uid()
    );

CREATE POLICY "Teachers can update their own tests"
    ON public.tests FOR UPDATE
    USING (created_by = auth.uid());

-- Create test_attempts policies
CREATE POLICY "Teachers can view attempts for their tests"
ON public.test_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tests
    JOIN profiles ON profiles.id = auth.uid()
    WHERE tests.id = test_attempts.test_id
    AND tests.created_by = profiles.id
    AND profiles.role = 'teacher'
  )
);

CREATE POLICY "Students can view their own attempts"
ON public.test_attempts FOR SELECT
USING (
  auth.uid() = student_id
);

CREATE POLICY "Students can create attempts"
ON public.test_attempts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  AND auth.uid() = student_id
);

CREATE POLICY "Students can update their own attempts"
ON public.test_attempts FOR UPDATE
USING (auth.uid() = student_id);

-- Enable RLS on test_attempts
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;

-- Refresh schema cache
ALTER TABLE public.profiles REPLICA IDENTITY FULL; 