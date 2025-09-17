-- Drop the ticket_assignments table and its indexes
DROP INDEX IF EXISTS idx_ticket_assignments_assignee_id;
DROP INDEX IF EXISTS idx_ticket_assignments_ticket_id;
DROP TABLE IF EXISTS ticket_assignments;
