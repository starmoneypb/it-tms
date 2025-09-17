-- Create ticket_assignments junction table for multiple assignees
CREATE TABLE IF NOT EXISTS ticket_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
  UNIQUE(ticket_id, assignee_id)
);

-- Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_ticket_id ON ticket_assignments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_assignments_assignee_id ON ticket_assignments(assignee_id);

-- Migrate existing single assignee data to the new table
INSERT INTO ticket_assignments (ticket_id, assignee_id, assigned_at)
SELECT id, assignee_id, updated_at
FROM tickets 
WHERE assignee_id IS NOT NULL;

-- Keep the old assignee_id column for now for backward compatibility
-- We'll remove it in a later migration once we're confident the new system works
