-- Remove topic column from knowledge_sharing_documents table
ALTER TABLE knowledge_sharing_documents DROP COLUMN IF EXISTS topic;

-- Drop the index for topic
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_topic;
