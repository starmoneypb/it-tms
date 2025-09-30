-- Add back the topic column to knowledge_sharing_documents table
ALTER TABLE knowledge_sharing_documents ADD COLUMN topic VARCHAR(100) NOT NULL DEFAULT 'General';

-- Recreate the index for topic
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_topic ON knowledge_sharing_documents(topic);
