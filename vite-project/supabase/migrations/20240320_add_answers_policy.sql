-- Enable RLS on answers table
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Students can insert their answers" ON answers;
DROP POLICY IF EXISTS "Students can view their own answers" ON answers;
DROP POLICY IF EXISTS "Teachers can view answers for their tests" ON answers;

-- Create policy to allow students to insert answers
CREATE POLICY "Students can insert their answers"
ON answers
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM test_attempts
    WHERE test_attempts.id = answers.test_attempt_id
    AND test_attempts.student_id = auth.uid()
  )
);

-- Create policy to allow students to view their own answers
CREATE POLICY "Students can view their own answers"
ON answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM test_attempts
    WHERE test_attempts.id = answers.test_attempt_id
    AND test_attempts.student_id = auth.uid()
  )
);

-- Create policy to allow teachers to view answers for their tests
CREATE POLICY "Teachers can view answers for their tests"
ON answers
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM test_attempts
    JOIN tests ON tests.id = test_attempts.test_id
    JOIN profiles ON profiles.id = auth.uid()
    WHERE test_attempts.id = answers.test_attempt_id
    AND tests.created_by = profiles.id
    AND profiles.role = 'teacher'
  )
); 