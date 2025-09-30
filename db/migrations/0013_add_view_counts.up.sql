-- Add view_count column to knowledge_sharing_documents table
ALTER TABLE knowledge_sharing_documents 
ADD COLUMN view_count INTEGER DEFAULT 0;

-- Create index for efficient sorting by view count
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_view_count ON knowledge_sharing_documents(view_count DESC);

-- Create index for combined popularity sorting (likes + views)
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_popularity ON knowledge_sharing_documents(
  (view_count + (SELECT COUNT(*) FROM knowledge_sharing_likes WHERE document_id = knowledge_sharing_documents.id)) DESC
);
