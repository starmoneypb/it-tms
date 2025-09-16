-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets (status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets (priority);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets (created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets (created_at);

-- Full text search index for title/description
CREATE INDEX IF NOT EXISTS idx_tickets_fulltext ON tickets USING GIN (to_tsvector('english', title || ' ' || description));