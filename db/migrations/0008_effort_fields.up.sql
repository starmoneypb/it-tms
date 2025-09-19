-- Add Effort fields to tickets
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS effort_data JSONB DEFAULT '{}';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS effort_score SMALLINT NOT NULL DEFAULT 0;


