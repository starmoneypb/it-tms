-- Drop profile_pictures table
DROP INDEX IF EXISTS idx_profile_pictures_created_at;
DROP INDEX IF EXISTS idx_profile_pictures_user_id;
DROP TABLE IF EXISTS profile_pictures;
