-- Add new fields to tickets table for enhanced scoring
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS red_flags_data JSONB DEFAULT '{}';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS impact_assessment_data JSONB DEFAULT '{}';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS urgency_timeline_data JSONB DEFAULT '{}';

-- Create user_scores table to track points awarded from completed tickets
CREATE TABLE IF NOT EXISTS user_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  points DECIMAL(10,2) NOT NULL DEFAULT 0,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticket_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_scores_user_id ON user_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_ticket_id ON user_scores(ticket_id);
CREATE INDEX IF NOT EXISTS idx_user_scores_points ON user_scores(points DESC);

-- Create a view for user rankings
CREATE OR REPLACE VIEW user_rankings AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  COALESCE(SUM(us.points), 0) as total_points,
  COUNT(us.ticket_id) as tickets_completed,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(us.points), 0) DESC, u.name ASC) as rank
FROM users u
LEFT JOIN user_scores us ON u.id = us.user_id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY total_points DESC, u.name ASC;

-- Add comment to track field changes
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_system_generated BOOLEAN DEFAULT FALSE;
