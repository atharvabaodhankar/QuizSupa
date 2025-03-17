-- Add foreign key constraints
ALTER TABLE test_attempts
ADD CONSTRAINT test_attempts_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users (id)
ON DELETE CASCADE;

ALTER TABLE test_attempts
ADD CONSTRAINT test_attempts_test_id_fkey
FOREIGN KEY (test_id)
REFERENCES tests (id)
ON DELETE CASCADE;

-- Create RLS policies for test_attempts
ALTER TABLE test_attempts ENABLE ROW LEVEL SECURITY;

-- Teachers can view attempts for their tests
CREATE POLICY "Teachers can view attempts for their tests"
ON test_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tests
    JOIN profiles ON profiles.id = auth.uid()
    WHERE tests.id = test_attempts.test_id
    AND tests.created_by = profiles.id
    AND profiles.role = 'teacher'
  )
);

-- Students can view their own attempts
CREATE POLICY "Students can view their own attempts"
ON test_attempts FOR SELECT
USING (
  auth.uid() = user_id
);

-- Students can create attempts
CREATE POLICY "Students can create attempts"
ON test_attempts FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'student'
  )
  AND auth.uid() = user_id
);

-- Students can update their own attempts
CREATE POLICY "Students can update their own attempts"
ON test_attempts FOR UPDATE
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_test_attempts_user_id ON test_attempts(user_id);
CREATE INDEX idx_test_attempts_test_id ON test_attempts(test_id);
CREATE INDEX idx_test_attempts_created_at ON test_attempts(created_at); 