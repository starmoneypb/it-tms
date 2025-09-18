-- Drop the view
DROP VIEW IF EXISTS user_rankings;

-- Drop the user_scores table
DROP TABLE IF EXISTS user_scores;

-- Remove new columns from tickets table
ALTER TABLE tickets DROP COLUMN IF EXISTS red_flags_data;
ALTER TABLE tickets DROP COLUMN IF EXISTS impact_assessment_data;
ALTER TABLE tickets DROP COLUMN IF EXISTS urgency_timeline_data;

-- Remove system generated comment flag
ALTER TABLE comments DROP COLUMN IF EXISTS is_system_generated;
