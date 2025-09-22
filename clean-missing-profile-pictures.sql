-- Clean up missing profile picture references
-- This script will clear profile picture references for files that don't exist

-- First, show current profile pictures
SELECT 
    id, 
    name, 
    email, 
    profile_picture,
    CASE 
        WHEN profile_picture IS NULL OR profile_picture = '' THEN 'No profile picture'
        ELSE 'Has profile picture'
    END as status
FROM users 
WHERE profile_picture IS NOT NULL AND profile_picture != ''
ORDER BY updated_at DESC;

-- Clear profile pictures for files with spaces in names (problematic files)
UPDATE users 
SET profile_picture = NULL, updated_at = NOW()
WHERE profile_picture IS NOT NULL 
  AND profile_picture != ''
  AND (
    profile_picture LIKE '%20%' OR  -- URL encoded space
    profile_picture LIKE '% %' OR   -- Actual space
    profile_picture LIKE '%(%' OR   -- Parentheses
    profile_picture LIKE '%)%'
  );

-- Clear specific problematic profile pictures from recent uploads
UPDATE users 
SET profile_picture = NULL, updated_at = NOW()
WHERE profile_picture IS NOT NULL 
  AND profile_picture != ''
  AND (
    profile_picture LIKE '%1758504%' OR
    profile_picture LIKE '%EMP001446%'
  );

-- Show the result after cleanup
SELECT 
    id, 
    name, 
    email, 
    profile_picture,
    CASE 
        WHEN profile_picture IS NULL OR profile_picture = '' THEN 'Will show fallback avatar'
        ELSE profile_picture
    END as display_status
FROM users 
ORDER BY updated_at DESC
LIMIT 10;

-- Count users by profile picture status
SELECT 
    CASE 
        WHEN profile_picture IS NULL OR profile_picture = '' THEN 'No profile picture (fallback avatar)'
        ELSE 'Has profile picture'
    END as status,
    COUNT(*) as count
FROM users 
GROUP BY 
    CASE 
        WHEN profile_picture IS NULL OR profile_picture = '' THEN 'No profile picture (fallback avatar)'
        ELSE 'Has profile picture'
    END;
