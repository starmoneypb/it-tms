-- Fix Profile Pictures Script
-- This script cleans up profile picture references for files that don't exist

-- First, let's see what profile pictures are currently set
SELECT id, name, email, profile_picture 
FROM users 
WHERE profile_picture IS NOT NULL AND profile_picture != '';

-- Update users with missing profile pictures to NULL
-- This will make the frontend show the fallback avatar instead of trying to load missing files
UPDATE users 
SET profile_picture = NULL, updated_at = NOW()
WHERE profile_picture IS NOT NULL 
  AND profile_picture != ''
  AND profile_picture LIKE '%1758503522549863994%';

-- Optional: Clear all profile pictures if you want to start fresh
-- Uncomment the line below if you want to reset all profile pictures
-- UPDATE users SET profile_picture = NULL, updated_at = NOW() WHERE profile_picture IS NOT NULL;

-- Verify the changes
SELECT id, name, email, profile_picture 
FROM users 
WHERE profile_picture IS NOT NULL AND profile_picture != '';

-- Show users without profile pictures (should show fallback avatars)
SELECT id, name, email, 
       CASE 
         WHEN profile_picture IS NULL OR profile_picture = '' THEN 'Will show fallback avatar'
         ELSE profile_picture 
       END as profile_status
FROM users;
