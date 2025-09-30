-- Remove view tracking table and function
DROP FUNCTION IF EXISTS get_ticket_view_count(UUID);
DROP TABLE IF EXISTS ticket_views;

-- Remove view_count column from tickets table
ALTER TABLE tickets DROP COLUMN IF EXISTS view_count;
