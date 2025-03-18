-- Add student info columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS roll_number TEXT;

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Teachers can view student profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;

-- Create separate policies for different operations
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Teachers can view all profiles"
    ON public.profiles FOR SELECT
    USING (
        auth.jwt()->>'role' = 'teacher'
    );

-- Refresh schema cache
ALTER TABLE public.profiles REPLICA IDENTITY FULL; 