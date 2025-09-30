-- Remove view_count column and related indexes
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_popularity;
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_view_count;
ALTER TABLE knowledge_sharing_documents DROP COLUMN IF EXISTS view_count;
