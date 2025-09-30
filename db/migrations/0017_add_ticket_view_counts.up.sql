-- Add view_count column to tickets table
ALTER TABLE tickets
ADD COLUMN view_count INTEGER DEFAULT 0;

-- Create index for efficient sorting by view count
CREATE INDEX IF NOT EXISTS idx_tickets_view_count ON tickets(view_count DESC);

-- Create table to track individual views for better accuracy
CREATE TABLE ticket_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ticket_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_ticket_views_ticket_id ON ticket_views(ticket_id);
CREATE INDEX idx_ticket_views_user_id ON ticket_views(user_id);
CREATE INDEX idx_ticket_views_viewed_at ON ticket_views(viewed_at);

-- Create a function to get accurate view count
CREATE OR REPLACE FUNCTION get_ticket_view_count(ticket_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id) 
        FROM ticket_views 
        WHERE ticket_id = ticket_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Update the view_count column to use the accurate count
-- This will be a one-time sync, future updates will be handled by the application
UPDATE tickets 
SET view_count = get_ticket_view_count(id);
