-- Fix profile picture URLs to use proper download endpoint format
-- This migration ensures all profile picture references use the new /profile-pictures/{id}/download format

-- First, clear any old /uploads/ references in the users table
UPDATE users 
SET profile_picture = NULL 
WHERE profile_picture IS NOT NULL 
AND profile_picture LIKE '/uploads/%';

-- Update any existing profile_pictures table entries to ensure users.profile_picture points to correct download URL
UPDATE users 
SET profile_picture = '/profile-pictures/' || pp.id || '/download'
FROM profile_pictures pp 
WHERE users.id = pp.user_id 
AND (users.profile_picture IS NULL OR users.profile_picture NOT LIKE '/profile-pictures/%/download');
