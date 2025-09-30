-- Remove author concept from knowledge sharing documents
-- This migration removes the author_id column and updates the system to use only contributors

-- First, ensure all authors are added as contributors if they aren't already
INSERT INTO knowledge_sharing_contributors (document_id, user_id, added_by)
SELECT d.id, d.author_id, d.author_id
FROM knowledge_sharing_documents d
WHERE NOT EXISTS (
    SELECT 1 FROM knowledge_sharing_contributors c 
    WHERE c.document_id = d.id AND c.user_id = d.author_id
);

-- Remove the author_id column from knowledge_sharing_documents
ALTER TABLE knowledge_sharing_documents DROP COLUMN IF EXISTS author_id;

-- Drop the index on author_id
DROP INDEX IF EXISTS idx_knowledge_sharing_documents_author_id;

-- Update the user_rankings view to remove author references
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
