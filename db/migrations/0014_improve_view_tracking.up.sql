-- Create table to track individual views for better accuracy
CREATE TABLE knowledge_sharing_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES knowledge_sharing_documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address INET,
    user_agent TEXT,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(document_id, user_id)
);

-- Create indexes for efficient queries
CREATE INDEX idx_knowledge_sharing_views_document_id ON knowledge_sharing_views(document_id);
CREATE INDEX idx_knowledge_sharing_views_user_id ON knowledge_sharing_views(user_id);
CREATE INDEX idx_knowledge_sharing_views_viewed_at ON knowledge_sharing_views(viewed_at);

-- Create a function to get accurate view count
CREATE OR REPLACE FUNCTION get_knowledge_sharing_view_count(document_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(DISTINCT user_id) 
        FROM knowledge_sharing_views 
        WHERE document_id = document_uuid
    );
END;
$$ LANGUAGE plpgsql;

-- Update the view_count column to use the accurate count
-- This will be a one-time sync, future updates will be handled by the application
UPDATE knowledge_sharing_documents 
SET view_count = get_knowledge_sharing_view_count(id);
