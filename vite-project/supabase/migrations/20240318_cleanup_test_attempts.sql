-- Delete test attempts with invalid dates (like 1970)
DELETE FROM test_attempts
WHERE completed_at < '2024-01-01';

-- Delete incomplete test attempts that are more than 24 hours old
DELETE FROM test_attempts
WHERE completed_at IS NULL 
AND created_at < NOW() - INTERVAL '24 hours';

-- Delete duplicate completed attempts for the same test and user
WITH ranked_attempts AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, test_id 
           ORDER BY completed_at DESC
         ) as rn
  FROM test_attempts
  WHERE completed_at IS NOT NULL
)
DELETE FROM test_attempts
WHERE id IN (
  SELECT id 
  FROM ranked_attempts 
  WHERE rn > 1
); 