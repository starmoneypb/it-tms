-- Rollback profile picture URL fixes
-- This would require manual intervention to restore old URLs if needed
-- Since we're moving to GCS, there's no safe automatic rollback

-- Clear all profile picture references
UPDATE users SET profile_picture = NULL;
