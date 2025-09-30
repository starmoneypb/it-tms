-- Remove is_published column from knowledge_sharing_documents table
ALTER TABLE knowledge_sharing_documents DROP COLUMN IF EXISTS is_published;

-- Drop the index for is_published
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_published;
