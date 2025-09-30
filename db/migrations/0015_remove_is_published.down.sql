-- Add back the is_published column to knowledge_sharing_documents table
ALTER TABLE knowledge_sharing_documents ADD COLUMN is_published BOOLEAN DEFAULT TRUE;

-- Recreate the index for is_published
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_published ON knowledge_sharing_documents(is_published);
