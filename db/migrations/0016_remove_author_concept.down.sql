-- Rollback: Restore author concept to knowledge sharing documents

-- Add back the author_id column
ALTER TABLE knowledge_sharing_documents ADD COLUMN author_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Create index on author_id
CREATE INDEX IF NOT EXISTS idx_knowledge_sharing_documents_author_id ON knowledge_sharing_documents(author_id);

-- Restore author_id values by taking the first contributor (oldest added_at) as the author
UPDATE knowledge_sharing_documents 
SET author_id = (
    SELECT c.user_id 
    FROM knowledge_sharing_contributors c 
    WHERE c.document_id = knowledge_sharing_documents.id 
    ORDER BY c.added_at ASC 
    LIMIT 1
);

-- Make author_id NOT NULL after populating it
ALTER TABLE knowledge_sharing_documents ALTER COLUMN author_id SET NOT NULL;

-- Update the user_rankings view to include author references again
DROP VIEW IF EXISTS user_rankings;
CREATE VIEW user_rankings AS
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  COALESCE(SUM(us.points), 0) + COALESCE(SUM(ks.points), 0) as total_points,
  COUNT(us.ticket_id) as tickets_completed,
  COUNT(DISTINCT ks.document_id) as knowledge_documents_created,
  ROW_NUMBER() OVER (ORDER BY COALESCE(SUM(us.points), 0) + COALESCE(SUM(ks.points), 0) DESC, u.name ASC) as rank
FROM users u
LEFT JOIN user_scores us ON u.id = us.user_id
LEFT JOIN knowledge_sharing_scores ks ON u.id = ks.user_id
GROUP BY u.id, u.name, u.email, u.role
ORDER BY total_points DESC, u.name ASC;
