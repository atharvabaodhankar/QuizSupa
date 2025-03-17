-- Add unlimited_attempts column to tests table
ALTER TABLE tests ADD COLUMN allow_unlimited_attempts BOOLEAN DEFAULT false;

-- Update RLS policies to include the new column
ALTER POLICY "Teachers can update their own tests" ON tests 
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

-- Function to check if student can attempt test
CREATE OR REPLACE FUNCTION can_attempt_test(test_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  attempt_count INTEGER;
  unlimited_attempts BOOLEAN;
BEGIN
  -- Get the number of completed attempts for this test by this user
  SELECT COUNT(*) INTO attempt_count
  FROM test_attempts
  WHERE test_id = $1 
    AND user_id = $2 
    AND completed_at IS NOT NULL;

  -- Get if test allows unlimited attempts
  SELECT allow_unlimited_attempts INTO unlimited_attempts
  FROM tests
  WHERE id = $1;

  -- Return true if either:
  -- 1. Test allows unlimited attempts
  -- 2. User hasn't completed any attempts yet
  RETURN unlimited_attempts OR attempt_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 