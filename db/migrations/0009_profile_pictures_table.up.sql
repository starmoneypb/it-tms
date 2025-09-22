-- Create profile_pictures table for attachment-style profile picture handling
CREATE TABLE IF NOT EXISTS profile_pictures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime TEXT NOT NULL,
    size BIGINT NOT NULL,
    path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profile_pictures_user_id ON profile_pictures(user_id);
CREATE INDEX IF NOT EXISTS idx_profile_pictures_created_at ON profile_pictures(created_at DESC);
